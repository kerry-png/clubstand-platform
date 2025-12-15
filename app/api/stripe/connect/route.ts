// app/api/admin/clubs/[clubId]/stripe/connect/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentAdminForClub } from '@/lib/admins';
import { canViewPayments } from '@/lib/permissions';

type Params = { clubId: string };
type Props = { params: Promise<Params> };

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

function deriveOnboardingStatus(acct: any) {
  if (!acct) return 'not_connected';
  if (acct.charges_enabled && acct.details_submitted) return 'connected';
  if (acct.details_submitted && !acct.charges_enabled) return 'restricted';
  return 'pending';
}

export async function POST(_req: Request, { params }: Props) {
  const { clubId } = await params;

  // Permission gate: same as Payments page (phase 1)
  const admin = await getCurrentAdminForClub(null as any, clubId);
  if (!admin || !canViewPayments(admin)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Load club
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

  const baseUrl = getBaseUrl();
  const refreshUrl = `${baseUrl}/admin/clubs/${clubId}/payments/stripe?refresh=1`;
  const returnUrl = `${baseUrl}/admin/clubs/${clubId}/payments/stripe?return=1`;

  let accountId = club.stripe_account_id as string | null;

  // Create Stripe account (Standard) if missing
  if (!accountId) {
    const acct = await stripe.accounts.create({
      type: 'standard',
      country: 'GB',
      business_type: 'non_profit',
      metadata: {
        club_id: clubId,
        club_name: club.name,
      },
    });

    accountId = acct.id;

    await supabaseServerClient
      .from('clubs')
      .update({
        stripe_account_id: accountId,
        stripe_onboarding_status: 'pending',
      })
      .eq('id', clubId);
  }

  // Create an onboarding link
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  // Refresh local status quickly (optional but nice)
  try {
    const acct = await stripe.accounts.retrieve(accountId);
    const onboardingStatus = deriveOnboardingStatus(acct);

    await supabaseServerClient
      .from('clubs')
      .update({
        stripe_charges_enabled: !!(acct as any).charges_enabled,
        stripe_payouts_enabled: !!(acct as any).payouts_enabled,
        stripe_details_submitted: !!(acct as any).details_submitted,
        stripe_onboarding_status: onboardingStatus,
        stripe_connected_at:
          (acct as any).charges_enabled && (acct as any).details_submitted
            ? new Date().toISOString()
            : null,
      })
      .eq('id', clubId);
  } catch {
    // ignore – onboarding link still works
  }

  return NextResponse.json({ url: link.url });
}
