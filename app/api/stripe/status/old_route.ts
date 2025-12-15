// app/api/admin/clubs/[clubId]/stripe/status/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentAdminForClub } from '@/lib/admins';
import { canViewPayments } from '@/lib/permissions';

type Params = { clubId: string };
type Props = { params: Promise<Params> };

function deriveOnboardingStatus(acct: any) {
  if (!acct) return 'not_connected';
  if (acct.charges_enabled && acct.details_submitted) return 'connected';
  if (acct.details_submitted && !acct.charges_enabled) return 'restricted';
  return 'pending';
}

export async function GET(_req: Request, { params }: Props) {
  const { clubId } = await params;

  const admin = await getCurrentAdminForClub(null as any, clubId);
  if (!admin || !canViewPayments(admin)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { data: club, error: clubErr } = await supabaseServerClient
    .from('clubs')
    .select(
      'id, name, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted, stripe_onboarding_status',
    )
    .eq('id', clubId)
    .maybeSingle();

  if (clubErr || !club) {
    return NextResponse.json({ error: 'Club not found' }, { status: 404 });
  }

  if (!club.stripe_account_id) {
    return NextResponse.json({
      connected: false,
      status: 'not_connected',
      stripe_account_id: null,
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
    });
  }

  const acct = await stripe.accounts.retrieve(club.stripe_account_id);

  const payload = {
    connected: true,
    status: deriveOnboardingStatus(acct),
    stripe_account_id: (acct as any).id,
    charges_enabled: !!(acct as any).charges_enabled,
    payouts_enabled: !!(acct as any).payouts_enabled,
    details_submitted: !!(acct as any).details_submitted,
    requirements: (acct as any).requirements ?? null,
  };

  // Persist to DB (so gating is cheap)
  await supabaseServerClient
    .from('clubs')
    .update({
      stripe_charges_enabled: payload.charges_enabled,
      stripe_payouts_enabled: payload.payouts_enabled,
      stripe_details_submitted: payload.details_submitted,
      stripe_onboarding_status: payload.status,
      stripe_connected_at:
        payload.charges_enabled && payload.details_submitted
          ? new Date().toISOString()
          : null,
    })
    .eq('id', clubId);

  return NextResponse.json(payload);
}
