// app/api/payments/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseServerClient } from '@/lib/supabaseServer';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { householdId } = await req.json();

    if (!householdId) {
      return NextResponse.json(
        { error: 'householdId is required' },
        { status: 400 },
      );
    }

    const supabase = supabaseServerClient;

    // Fetch pending subs + joined plan info
    const { data: subs, error } = await supabase
      .from('membership_subscriptions')
      .select(
        `
        id,
        amount_pennies,
        membership_plans (
          billing_period,
          stripe_price_id_annual,
          stripe_price_id_monthly,
          name,
          slug
        )
      `,
      )
      .eq('household_id', householdId)
      .eq('status', 'pending');

    if (error) {
      console.error('Checkout: failed to load subscriptions', error);
      return NextResponse.json(
        { error: 'Failed to load subscriptions' },
        { status: 500 },
      );
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json(
        { error: 'No pending subscriptions' },
        { status: 400 },
      );
    }

    // Stripe line items with safety guard for missing prices
    const missingPricePlans: string[] = [];
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const sub of subs as any[]) {
      const plan = sub.membership_plans;
      if (!plan) {
        throw new Error(
          `Subscription ${sub.id} is missing membership plan for household ${householdId}`,
        );
      }

      // Decide which Stripe price to use based on plan billing_period
      let priceId: string | null = null;

      if (plan.billing_period === 'monthly') {
        priceId = plan.stripe_price_id_monthly;
      } else {
        // Treat 'annual' and 'one_off' as annual prices; fall back if needed
        priceId =
          plan.stripe_price_id_annual ?? plan.stripe_price_id_monthly;
      }

      if (!priceId) {
        // Track plans that aren't ready for online payment
        missingPricePlans.push(`${plan.name} (slug: ${plan.slug})`);
        continue;
      }

      line_items.push({
        price: priceId,
        quantity: 1,
      });
    }

    // If any plan in the basket has no Stripe price, bail with a clean error
    if (missingPricePlans.length > 0) {
      return NextResponse.json(
        {
          error:
            'Some membership plans are not configured for online payment yet.',
          details:
            'Please add Stripe price IDs for these plans before taking payment online.',
          plans: missingPricePlans,
        },
        { status: 400 },
      );
    }

    const origin =
      req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items,
      success_url: `${origin}/membership/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/club/rainhill-cc/join?cancelled=1`,
      metadata: {
        household_id: householdId,
        subscription_ids: subs.map((s: any) => s.id).join(','),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
