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

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature' },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      webhookSecret,
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err);
    return NextResponse.json(
      { error: 'Invalid Stripe signature' },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};

        const clubId = metadata.club_id || null;
        const householdId = metadata.household_id || null;
        const membershipYearStr = metadata.membership_year || null;

        let membershipYear: number | null = null;
        if (membershipYearStr) {
          const parsed = Number(membershipYearStr);
          membershipYear = Number.isFinite(parsed) ? parsed : null;
        }

        // subscription_ids is stored as a JSON string of an array
        // e.g. '["id1","id2","id3"]'
        let subscriptionIds: string[] = [];

        const rawSubIds =
          metadata.subscription_ids || metadata.subscription_id || null;

        if (rawSubIds) {
          try {
            const parsed = JSON.parse(rawSubIds);
            if (Array.isArray(parsed)) {
              subscriptionIds = parsed.map((x) => String(x));
            } else {
              subscriptionIds = [String(parsed)];
            }
          } catch (_err) {
            // Not valid JSON, treat as a single id
            subscriptionIds = [String(rawSubIds)];
          }
        }

        if (!subscriptionIds.length) {
          console.warn(
            'checkout.session.completed webhook without subscription_ids metadata',
            {
              clubId,
              householdId,
              membershipYear,
              sessionId: session.id,
            },
          );
          break; // nothing to update, but still return 200 at the end
        }

        console.log(
          'Updating membership_subscriptions to active from webhook',
          {
            subscriptionIds,
            clubId,
            householdId,
            membershipYear,
            sessionId: session.id,
          },
        );

        const updates: Record<string, any> = {
          status: 'active',
          updated_at: new Date().toISOString(),
        };

        // In practice, start_date should be "today" in club’s calendar
        updates.start_date = new Date().toISOString().slice(0, 10);

        if (membershipYear !== null) {
          updates.membership_year = membershipYear;
        }

        const { error: updateError } = await supabase
          .from('membership_subscriptions')
          .update(updates)
          .in('id', subscriptionIds);

        if (updateError) {
          console.error(
            'Failed to update membership_subscriptions from webhook',
            updateError,
          );
        }

        // (Optional) you could also insert a row in membership_payments here
        // using session.payment_intent, amount_total, etc.

        break;
      }

      case 'payment_intent.succeeded': {
        // We don’t *need* this for now, but you can log it for debugging.
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log('payment_intent.succeeded', {
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
        });
        break;
      }

      default: {
        // For all other event types we don’t care about right now,
        // just log them and carry on.
        console.log(`Unhandled Stripe event type: ${event.type}`);
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

  // Tell Stripe we handled it successfully
  return NextResponse.json({ received: true }, { status: 200 });
}
