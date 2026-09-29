// app/api/households/[householdId]/memberships/[subscriptionId]/route.ts

import { NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/auth/householdAccess';

type Params = { householdId: string; subscriptionId: string };
type Action = 'cancel' | 'pause' | 'resume' | 'enable_auto_renew' | 'disable_auto_renew';

export async function PATCH(
  req: Request,
  context: { params: Promise<Params> },
) {
  const { householdId, subscriptionId } = await context.params;
  const access = await requireHouseholdAccess(householdId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action as Action | undefined;
  if (!action) return NextResponse.json({ error: 'Missing action.' }, { status: 400 });

  const { data: subscription, error: loadError } = await access.supabase
    .from('membership_subscriptions')
    .select('id, household_id, club_id, status, auto_renews, stripe_subscription_id')
    .eq('id', subscriptionId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (loadError || !subscription) {
    return NextResponse.json({ error: 'Membership not found.' }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let update: Record<string, unknown>;

  switch (action) {
    case 'cancel':
      if (!['pending', 'active', 'paused'].includes(subscription.status)) {
        return NextResponse.json({ error: 'This membership cannot be ended from its current status.' }, { status: 400 });
      }
      // Stripe-backed recurring subscriptions need cancellation through the payment lifecycle.
      if (subscription.stripe_subscription_id) {
        return NextResponse.json(
          { error: 'This membership has a recurring Stripe payment. Cancel the payment arrangement before ending the membership.' },
          { status: 409 },
        );
      }
      update = { status: 'cancelled', end_date: today, auto_renews: false };
      break;
    case 'pause':
      if (subscription.status !== 'active') {
        return NextResponse.json({ error: 'Only an active membership can be paused.' }, { status: 400 });
      }
      update = { status: 'paused' };
      break;
    case 'resume':
      if (subscription.status !== 'paused') {
        return NextResponse.json({ error: 'Only a paused membership can be resumed.' }, { status: 400 });
      }
      update = { status: 'active', end_date: null };
      break;
    case 'enable_auto_renew':
      if (!['active', 'pending'].includes(subscription.status)) {
        return NextResponse.json({ error: 'Auto-renew can only be changed on a current membership.' }, { status: 400 });
      }
      update = { auto_renews: true };
      break;
    case 'disable_auto_renew':
      update = { auto_renews: false };
      break;
    default:
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await access.supabase
    .from('membership_subscriptions')
    .update(update)
    .eq('id', subscriptionId)
    .eq('household_id', householdId)
    .select('id, status, end_date, auto_renews')
    .single();

  if (updateError) {
    console.error('Membership lifecycle update failed', updateError);
    return NextResponse.json({ error: 'Could not update membership.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, membership: updated });
}
