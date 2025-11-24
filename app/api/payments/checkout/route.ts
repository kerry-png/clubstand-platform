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
          stripe_price_id,
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

    // Stripe line items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      subs.map((sub: any) => {
        const priceId = sub.membership_plans?.stripe_price_id;
        if (!priceId) {
          throw new Error(
            `Plan missing stripe_price_id for household ${householdId}`,
          );
        }
        return {
          price: priceId,
          quantity: 1,
        };
      });

    const origin =
      req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      success_url: `${origin}/membership/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/club/rainhillcc/join?cancelled=1`,
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
