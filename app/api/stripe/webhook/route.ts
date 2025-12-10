// app/api/stripe/webhook/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseServerClient } from '@/lib/supabaseServer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error('❌ Missing STRIPE_WEBHOOK_SECRET');
    return new NextResponse('Webhook not configured', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return new NextResponse('Missing signature', { status: 400 });
    }

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed', err);
    return new NextResponse(`Webhook signature error: ${err.message}`, {
      status: 400,
    });
  }

  // We only care about checkout.session.completed for membership payments
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};

  const householdId = metadata.household_id || null;
  const clubId = metadata.club_id || null;
  const membershipYear = metadata.membership_year || null;

  // Parse subscription IDs from metadata
  let subscriptionIds: string[] = [];
  try {
    subscriptionIds = JSON.parse(
      metadata.subscription_ids || '[]',
    ) as string[];
  } catch (err) {
    console.error(
      '⚠ Failed to parse subscription_ids from metadata',
      err,
      metadata.subscription_ids,
    );
  }

  if (!subscriptionIds.length) {
    console.warn(
      '⚠ checkout.session.completed without subscription_ids – nothing to activate',
    );
    return NextResponse.json({ received: true });
  }

  const amountPaidPennies =
    session.amount_total !== null && session.amount_total !== undefined
      ? session.amount_total
      : 0;

  const paymentIntentId = session.payment_intent
    ? String(session.payment_intent)
    : null;

  const supabase = supabaseServerClient;

  try {
    // 1) Activate membership_subscriptions
    for (const subId of subscriptionIds) {
      const { data: existing, error: existingErr } = await supabase
        .from('membership_subscriptions')
        .select('id, status')
        .eq('id', subId)
        .maybeSingle();

      if (existingErr) {
        console.error(
          '❌ Webhook – failed to load subscription',
          subId,
          existingErr,
        );
        continue;
      }

      if (!existing) {
        console.warn(
          '⚠ Webhook – subscription not found for id',
          subId,
        );
        continue;
      }

      if (existing.status === 'active') {
        console.log(
          `ℹ Webhook – subscription ${subId} already active, skipping`,
        );
        continue;
      }

      const { error: updateErr } = await supabase
        .from('membership_subscriptions')
        .update({
          status: 'active',
          start_date: new Date().toISOString().slice(0, 10),
          stripe_subscription_id: paymentIntentId,
        })
        .eq('id', subId);

      if (updateErr) {
        console.error(
          '❌ Webhook – failed to activate subscription',
          subId,
          updateErr,
        );
      } else {
        console.log(`✅ Webhook – subscription activated: ${subId}`);
      }
    }

    // 2) Record a payment row (best effort – don’t fail webhook if this fails)
    const { error: paymentErr } = await supabase
      .from('membership_payments')
      .insert({
        club_id: clubId,
        household_id: householdId,
        amount_pennies: amountPaidPennies,
        currency: session.currency?.toUpperCase() ?? 'GBP',
        external_reference: session.id,
        stripe_payment_intent_id: paymentIntentId,
        paid_at: new Date().toISOString(),
        method: 'card_stripe',
        membership_year: membershipYear,
      });

    if (paymentErr) {
      console.error(
        '⚠ Webhook – failed to insert membership_payments row',
        paymentErr,
      );
    } else {
      console.log('💰 Webhook – membership_payments row created');
    }
  } catch (err: any) {
    console.error('❌ Webhook – unexpected error', err);
    // Let Stripe retry, this is a genuine failure
    return new NextResponse('Webhook handler error', { status: 500 });
  }

  return NextResponse.json({ received: true });
}