// app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseServerClient } from '@/lib/supabaseServer';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function deriveOnboardingStatus(acct: any) {
  if (!acct) return 'not_connected';
  if (acct.charges_enabled && acct.details_submitted) return 'connected';
  if (acct.details_submitted && !acct.charges_enabled) return 'restricted';
  return 'pending';
}

export async function POST(req: Request) {
  const supabase = supabaseServerClient;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    console.error('Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed', err);
    return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 });
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
        let subscriptionIds: string[] = [];
        const rawSubIds = metadata.subscription_ids || metadata.subscription_id || null;

        if (rawSubIds) {
          try {
            const parsed = JSON.parse(rawSubIds);
            if (Array.isArray(parsed)) subscriptionIds = parsed.map((x) => String(x));
            else subscriptionIds = [String(parsed)];
          } catch {
            subscriptionIds = [String(rawSubIds)];
          }
        }

        if (!subscriptionIds.length) {
          console.warn('checkout.session.completed webhook without subscription_ids metadata', {
            clubId,
            householdId,
            membershipYear,
            sessionId: session.id,
          });
          break;
        }

        const updates: Record<string, any> = {
          status: 'active',
          updated_at: new Date().toISOString(),
          start_date: new Date().toISOString().slice(0, 10),
        };

        if (membershipYear !== null) {
          updates.membership_year = membershipYear;
        }

        const { error: updateError } = await supabase
          .from('membership_subscriptions')
          .update(updates)
          .in('id', subscriptionIds);

        if (updateError) {
          console.error('Failed to update membership_subscriptions from webhook', updateError);
        }

        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log('payment_intent.succeeded', { id: pi.id, amount: pi.amount, currency: pi.currency });
        break;
      }

      // ✅ Connect: keep club Stripe status in sync
      case 'account.updated': {
        const acct = event.data.object as Stripe.Account;

        const { error: updateErr } = await supabase
          .from('clubs')
          .update({
            stripe_charges_enabled: !!acct.charges_enabled,
            stripe_payouts_enabled: !!acct.payouts_enabled,
            stripe_details_submitted: !!acct.details_submitted,
            stripe_onboarding_status: deriveOnboardingStatus(acct),
            stripe_connected_at:
              acct.charges_enabled && acct.details_submitted ? new Date().toISOString() : null,
          })
          .eq('stripe_account_id', acct.id);

        if (updateErr) {
          console.error('Failed updating club Stripe status from account.updated', updateErr);
        }

        break;
      }

      default: {
        console.log(`Unhandled Stripe event type: ${event.type}`);
        break;
      }
    }
  } catch (err) {
    console.error('Error handling Stripe webhook event', err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
