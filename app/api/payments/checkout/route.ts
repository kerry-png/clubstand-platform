import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { requireHouseholdAccess } from '@/lib/auth/householdAccess';
import { DEFAULT_MEMBERSHIP_SETTINGS, currentMembershipYear, isJunior } from '@/lib/membership/rules';
import { consentAppliesTo } from '@/lib/consent/applicability';

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
    const { householdId, membershipYear: requestedMembershipYear, renewalCheckout } = await req.json();

    if (!householdId) {
      return NextResponse.json({ error: 'Missing householdId' }, { status: 400 });
    }

    const access = await requireHouseholdAccess(householdId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
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

    // Commercial terms are controlled by ClubStand, not the club. During migration,
    // legacy club fee columns remain the fallback so existing clubs are not broken.
    const { data: commercialTerms } = await supabaseServerClient
      .from('club_commercial_terms')
      .select('status,membership_transaction_fee_percent')
      .eq('club_id', clubId)
      .maybeSingle();
    const feePercent = normalisePercent(
      commercialTerms?.membership_transaction_fee_percent ?? club.transaction_fee_percent,
    );
    const flatFeePennies = Number(club.transaction_fee_flat_pennies ?? 0); // reserved for one-off services

    // 2) Load pending subscriptions for this household
    const { data: allPendingSubs, error: pendingErr } = await supabaseServerClient
      .from('membership_subscriptions')
      .select(
        `
        id,
        member_id,
        plan_id,
        membership_year,
        amount_pennies,
        discount_pennies,
        joining_treatment,
        trial_ends_at,
        requires_manual_review,
        review_status,
        plan:membership_plans (
          id,
          name,
          billing_period,
          allow_annual,
          allow_monthly,
          annual_price_pennies,
          monthly_price_pennies,
          stripe_price_id_annual_connected,
          stripe_price_id_monthly_connected
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

    const pendingSubs = requestedMembershipYear
      ? (allPendingSubs ?? []).filter((x:any) => Number(x.membership_year) === Number(requestedMembershipYear))
      : (allPendingSubs ?? []);

    if (!pendingSubs || pendingSubs.length === 0) {
      return NextResponse.json(
        {
          error:
            'No pending memberships were found to pay for. If this is unexpected, please contact the club.',
        },
        { status: 400 },
      );
    }

    // Payment is deliberately separate from membership entitlement.
    // Never send held/approval/trial/manual memberships to Stripe.
    const blocked = (pendingSubs as any[]).filter((s) => {
      const trialActive = s.joining_treatment === 'trial' &&
        (!s.trial_ends_at || new Date(s.trial_ends_at).getTime() > Date.now());
      return s.requires_manual_review === true ||
        s.review_status === 'pending' ||
        s.review_status === 'rejected' ||
        s.joining_treatment === 'manual' ||
        trialActive;
    });
    if (blocked.length) {
      return NextResponse.json(
        {
          error: 'One or more memberships are not ready for payment yet. The club must finish any approval, trial or manual-price review first.',
          code: 'membership_not_payable',
          blocked_subscription_ids: blocked.map((s) => s.id),
        },
        { status: 409 },
      );
    }

    // A renewal can be prepared ahead of time, but ordinary checkout must not
    // silently mix a future membership year into today's payment.
    const { data: settingsRow } = await supabaseServerClient.from('club_membership_settings').select('*').eq('club_id', clubId).maybeSingle();
    const membershipSettings = { ...DEFAULT_MEMBERSHIP_SETTINGS, ...(settingsRow ?? {}) };
    const payableYear = currentMembershipYear(new Date(), membershipSettings);
    const futureSubs = (pendingSubs as any[]).filter((s) => Number(s.membership_year) > payableYear);
    if (futureSubs.length && !renewalCheckout) {
      return NextResponse.json({ error: 'A future-year renewal is prepared but is not yet available through the normal payment checkout.', code: 'future_renewal_not_payable' }, { status: 409 });
    }
    if (renewalCheckout) {
      const renewalYear = payableYear + 1;
      if (Number(requestedMembershipYear) !== renewalYear) return NextResponse.json({ error: 'Invalid renewal year.' }, { status: 400 });
      if ((pendingSubs as any[]).some((x) => Number(x.membership_year) !== renewalYear)) return NextResponse.json({ error: 'Current and renewal memberships cannot be mixed in one renewal payment.' }, { status: 409 });
      // Renewal checkout is scoped to the people who actually have a renewal prepared.
      // A household may include a non-member account holder or somebody who is not renewing.
      const renewalMemberIds = new Set((pendingSubs as any[]).map((x) => x.member_id).filter(Boolean));
      // Required current policy versions must be accepted. Historic versions do not satisfy a changed form.
      const { data: requiredQuestions } = await supabaseServerClient.from('club_consent_questions').select('id,applies_to').eq('club_id', clubId).eq('is_active', true).eq('required', true);
      const { data: currentVersions } = await supabaseServerClient.from('club_policy_versions').select('id,question_id,version').eq('club_id', clubId).is('retired_at', null).order('version', { ascending: false });
      const latest = new Map<string,string>(); for (const v of currentVersions ?? []) if (!latest.has(v.question_id)) latest.set(v.question_id, v.id);
      const { data: acceptedRows } = await supabaseServerClient.from('member_policy_acceptances').select('member_id,policy_version_id').eq('household_id', householdId).is('revoked_at', null);
      const accepted = new Set((acceptedRows ?? []).map((x:any) => `${x.member_id ?? 'household'}:${x.policy_version_id}`));
      const { data: renewalMembers } = await supabaseServerClient.from('members').select('id,date_of_birth,member_type').eq('household_id', householdId).eq('club_id', clubId).in('id', Array.from(renewalMemberIds) as string[]);
      for (const q of requiredQuestions ?? []) {
        const versionId = latest.get(q.id); if (!versionId) continue;
        if (q.applies_to === 'household') {
          if (!accepted.has(`household:${versionId}`)) return NextResponse.json({ error: 'Required renewal forms are still incomplete.' }, { status: 409 });
          continue;
        }
        for (const m of renewalMembers ?? []) {
          const context = m.member_type === 'supporter' ? 'parent' : m.date_of_birth && isJunior(m.date_of_birth, renewalYear, membershipSettings) === true ? 'junior' : 'adult';
          if (consentAppliesTo(q.applies_to, context as any) && !accepted.has(`${m.id}:${versionId}`)) return NextResponse.json({ error: 'Required renewal forms are still incomplete.' }, { status: 409 });
        }
      }
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