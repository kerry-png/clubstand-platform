import { NextResponse } from 'next/server';
import { getCurrentAdminForClub } from '@/lib/admins';
import { supabaseServerClient } from '@/lib/supabaseServer';

type RouteParams = { clubId: string; invitationId: string };

export async function PATCH(
  req: Request,
  context: { params: Promise<RouteParams> | RouteParams },
) {
  const { clubId, invitationId } = await context.params;
  const admin = await getCurrentAdminForClub(req, clubId);

  if (!admin || (!admin.is_super_admin && !admin.can_manage_members)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (body?.action !== 'revoke') {
    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  }

  const { data, error } = await supabaseServerClient
    .from('membership_invitations')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .eq('club_id', clubId)
    .in('status', ['draft', 'sent', 'opened', 'in_progress'])
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Revoke membership invitation error', error);
    return NextResponse.json({ error: 'Failed to revoke the invitation.' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Active invitation not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

