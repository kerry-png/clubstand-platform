import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseServerClient } from '@/lib/supabaseServer';

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

function normalisePercent(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 100);
}

export async function POST(req: Request) {
  try {
    const { householdId } = await req.json();

    if (!householdId) {
      return NextResponse.json({ error: 'Missing householdId' }, { status: 400 });
    }

    // 1) Load household to get the club_id
    const { data: household, error: householdErr } = await supabaseServerClient
      .from('households')
      .select('id, club_id')
      .eq('id', householdId)
      .single();

    if (householdErr || !household) {
      console.error('Household not found for checkout', householdErr);
      return NextResponse.json({ error: 'Household not found' }, { status: 404 });
    }

    const clubId = household.club_id;

    // 1b) Load club Stripe Connect status + per-club transaction fee settings
    const { data: club, error: clubErr } = await supabaseServerClient
      .from('clubs')
      .select(
        `
        id,
        stripe_account_id,
        stripe_charges_enabled,
        stripe_details_submitted,
        stripe_onboarding_status,
        transaction_fee_percent,
        transaction_fee_flat_pennies
        `,
      )
      .eq('id', clubId)
      .maybeSingle();

    if (clubErr || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Gate: cannot take payments until connected
    if (
      !club.stripe_account_id ||
      !club.stripe_charges_enabled ||
      !club.stripe_details_submitted
    ) {
      return NextResponse.json(
        {
          error:
            'This club is not yet set up to take payments. Please contact the club admin.',
          code: 'stripe_not_connected',
        },
        { status: 400 },
      );
    }

    const connectedAccountId = club.stripe_account_id as string;

    // Per-club fees (subscriptions use percentage; flat fee reserved for future one-off services)
    const feePercent = normalisePercent(club.transaction_fee_percent);
    const flatFeePennies = Number(club.transaction_fee_flat_pennies ?? 0); // not used yet for subscriptions

    // 2) Load pending subscriptions for this household
    const { data: pendingSubs, error: pendingErr } = await supabaseServerClient
      .from('membership_subscriptions')
      .select(
        `
        id,
        plan_id,
        membership_year,
        amount_pennies,
        discount_pennies,
        plan:membership_plans (
          id,
          name,
          billing_period,
          allow_annual,
          allow_monthly,
          annual_price_pennies,
          monthly_price_pennies,
          stripe_price_id_annual,
          stripe_price_id_monthly
        )
      `,
      )
      .eq('household_id', householdId)
      .eq('status', 'pending');

    if (pendingErr) {
      console.error('Failed loading pending subs', pendingErr);
      return NextResponse.json(
        { error: 'Failed loading pending subscriptions' },
        { status: 500 },
      );
    }

    if (!pendingSubs || pendingSubs.length === 0) {
      return NextResponse.json(
        {
          error:
            'No pending memberships were found to pay for. If this is unexpected, please contact the club.',
        },
        { status: 400 },
      );
    }

    const subscriptionIds = pendingSubs.map((s: any) => s.id as string);
    const membershipYear =
      pendingSubs[0]?.membership_year ?? new Date().getFullYear();

    // 3) Decide which Stripe price to use for each subscription
    type GroupedLineItem = {
      price: string;
      quantity: number;
      name?: string | null;
    };

    const grouped: Record<string, GroupedLineItem> = {};

    for (const rawSub of pendingSubs as any[]) {
      const subAmount: number = rawSub.amount_pennies;
      const planArray = rawSub.plan as any;
      const planRow = Array.isArray(planArray) ? planArray[0] : planArray;

      if (!planRow) {
        return NextResponse.json(
          { error: 'A pending membership is missing its plan configuration.' },
          { status: 400 },
        );
      }

      const planName: string | null = planRow.name ?? null;
      const annualPrice: number | null = planRow.annual_price_pennies;
      const monthlyPrice: number | null = planRow.monthly_price_pennies;
      const allowAnnual: boolean = !!planRow.allow_annual;
      const allowMonthly: boolean = !!planRow.allow_monthly;
      const stripeAnnual: string | null = planRow.stripe_price_id_annual_connected;
      const stripeMonthly: string | null = planRow.stripe_price_id_monthly_connected;

      // ✅ Clear “not synced yet” message
        if ((allowAnnual && !stripeAnnual) || (allowMonthly && !stripeMonthly)) {
          return NextResponse.json(
            {
              error: `Stripe prices have not been synced to this club’s Stripe account for plan "${planName ?? 'Unknown'}". Go to Admin → Payments → Stripe and click “Sync membership prices”.`,
              code: 'stripe_prices_not_synced',
            },
            { status: 400 },
          );
        }

      let priceId: string | undefined;

      // Prefer an exact match on amount -> which billing option this sub is using
      if (
        allowMonthly &&
        monthlyPrice != null &&
        subAmount === monthlyPrice &&
        stripeMonthly
      ) {
        priceId = stripeMonthly;
      } else if (
        allowAnnual &&
        annualPrice != null &&
        subAmount === annualPrice &&
        stripeAnnual
      ) {
        priceId = stripeAnnual;
      } else {
        // Fallbacks if exact match fails (eg. legacy data)
        if (allowAnnual && stripeAnnual) priceId = stripeAnnual;
        else if (allowMonthly && stripeMonthly) priceId = stripeMonthly;
      }

      if (!priceId) {
        return NextResponse.json(
          {
            error: `Could not match a Stripe price for plan "${planName ?? 'Unknown'}" (amount ${subAmount}). Check the plan’s Stripe prices and amounts.`,
            code: 'stripe_price_match_failed',
          },
          { status: 400 },
        );
      }

      if (!grouped[priceId]) {
        grouped[priceId] = { price: priceId, quantity: 1, name: planName };
      } else {
        grouped[priceId].quantity += 1;
      }
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      Object.values(grouped).map((item) => ({
        price: item.price,
        quantity: item.quantity,
      }));

    // 4) Build redirect URLs
    const baseUrl = getBaseUrl();
    const successUrl = `${baseUrl}/membership/thank-you?household=${householdId}`;
    const cancelUrl = `${baseUrl}/household/${householdId}?payment=cancelled`;

    // 5) Create Stripe Checkout Session ON THE CONNECTED ACCOUNT
    // NOTE: For subscriptions, Stripe supports application_fee_percent (not flat).
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        line_items,
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data:
          feePercent > 0 ? { application_fee_percent: feePercent } : undefined,
        metadata: {
          household_id: householdId,
          club_id: clubId,
          membership_year: String(membershipYear),
          subscription_ids: JSON.stringify(subscriptionIds),

          // Useful for debugging later (and for future services)
          clubstand_fee_percent: String(feePercent),
          clubstand_fee_flat_pennies: String(flatFeePennies),
        },
      },
      {
        stripeAccount: connectedAccountId,
      },
    );

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          'Unexpected error preparing membership payment. Please try again.',
      },
      { status: 500 },
    );
  }
}