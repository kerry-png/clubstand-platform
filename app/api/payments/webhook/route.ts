// app/api/payments/webhook/route.ts

import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseServerClient } from '@/lib/supabaseServer';
import Stripe from 'stripe';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 },
    );
  }

  if (!sig) {
    console.error('Missing Stripe signature header');
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  const supabase = supabaseServerClient;

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      const householdId = metadata.household_id as string | undefined;
      const subscriptionIdsRaw =
        (metadata.subscription_ids as string | undefined) ?? '';

      const subscriptionIds = subscriptionIdsRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      console.log('Webhook: checkout.session.completed', {
        householdId,
        subscriptionIds,
      });

      if (subscriptionIds.length > 0) {
        const { error: updateError } = await supabase
          .from('membership_subscriptions')
          .update({
            status: 'active',
            paid_at: new Date().toISOString(),
          })
          .in('id', subscriptionIds);

        if (updateError) {
          console.error(
            'Failed to update membership_subscriptions:',
            updateError,
          );
          return NextResponse.json(
            {
              error: 'Failed to update subscriptions as active',
              details: updateError.message,
            },
            { status: 500 },
          );
        }
      } else {
        console.warn(
          'No subscription_ids found in metadata for session',
          session.id,
        );
      }
    }

    // You can handle other event types here later if needed.

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Unexpected webhook handler error:', err);
    return NextResponse.json(
      { error: 'Internal webhook error' },
      { status: 500 },
    );
  }
}
