// app/api/stripe/webhook/route.ts

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseServerClient } from '@/lib/supabaseServer';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  const supabase = supabaseServerClient;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 },
    );
  }

  // 1) Read raw body & signature
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      webhookSecret,
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 },
    );
  }

  // 2) Handle event types we care about
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        // Single-sub flow (memberships/start) uses subscription_id
        const singleSubscriptionId = metadata.subscription_id as
          | string
          | undefined;

        // Household flow (payments/checkout) uses subscription_ids (comma-separated)
        const subscriptionIdsRaw = metadata.subscription_ids as
          | string
          | undefined;

        // Shared fields
        const clubId = metadata.club_id;
        const membershipYear = metadata.membership_year;

        const stripeSubscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : null;

        // Build a list of local subscription IDs to activate
        let subscriptionIds: string[] = [];

        if (subscriptionIdsRaw) {
          subscriptionIds = subscriptionIdsRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (singleSubscriptionId) {
          subscriptionIds = [singleSubscriptionId];
        }

        if (subscriptionIds.length === 0) {
          console.warn(
            'checkout.session.completed without subscription_id or subscription_ids metadata',
            {
              metadata,
              stripeSubscriptionId,
            },
          );
          break;
        }

        const today = new Date().toISOString().slice(0, 10);

        const updatePayload: Record<string, any> = {
          status: 'active',
          start_date: today,
        };

        if (stripeSubscriptionId) {
          updatePayload.stripe_subscription_id = stripeSubscriptionId;
        }

        const { error } = await supabase
          .from('membership_subscriptions')
          .update(updatePayload)
          .in('id', subscriptionIds);

        if (error) {
          console.error('Failed to update subscription(s) to active', {
            error,
            subscriptionIds,
            clubId,
            membershipYear,
            stripeSubscriptionId,
          });
        } else {
          console.log('Subscriptions marked active from checkout.session.completed', {
            subscriptionIds,
            stripeSubscriptionId,
          });
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const stripeSubId = sub.id;

        const today = new Date().toISOString().slice(0, 10);

        const { error } = await supabase
          .from('membership_subscriptions')
          .update({
            status: 'cancelled',
            end_date: today,
          })
          .eq('stripe_subscription_id', stripeSubId);

        if (error) {
          console.error('Failed to mark subscription as cancelled', {
            error,
            stripeSubId,
          });
        } else {
          console.log('Subscriptions marked cancelled from customer.subscription.deleted', {
            stripeSubId,
          });
        }

        break;
      }

      default: {
        // Ignore other events for now
        break;
      }
    }
  } catch (err) {
    console.error('Error handling Stripe webhook event', err);
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 },
    );
  }

  // 3) Tell Stripe we handled it successfully
  return NextResponse.json({ received: true }, { status: 200 });
}
