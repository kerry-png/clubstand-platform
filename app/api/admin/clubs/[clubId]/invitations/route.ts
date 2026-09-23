import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getCurrentAdminForClub } from '@/lib/admins';
import { supabaseServerClient } from '@/lib/supabaseServer';

type RouteParams = { clubId: string };

async function getParams(context: { params: Promise<RouteParams> | RouteParams }) {
  return await context.params;
}

function normaliseEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function invitationUrl(req: Request, invitationId: string, token: string) {
  const origin = new URL(req.url).origin;
  return `${origin}/invitation/${invitationId}?token=${encodeURIComponent(token)}`;
}

export async function GET(req: Request, context: { params: Promise<RouteParams> | RouteParams }) {
  const { clubId } = await getParams(context);
  const admin = await getCurrentAdminForClub(req, clubId);

  if (!admin || (!admin.is_super_admin && !admin.can_manage_members)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 403 });
  }

  const { data, error } = await supabaseServerClient
    .from('membership_invitations')
    .select(`
      id,
      season_year,
      account_holder_first_name,
      account_holder_last_name,
      email,
      internal_note,
      status,
      expires_at,
      sent_at,
      opened_at,
      started_at,
      completed_at,
      revoked_at,
      created_at
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load membership invitations error', error);
    return NextResponse.json({ error: 'Failed to load invitations' }, { status: 500 });
  }

  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(req: Request, context: { params: Promise<RouteParams> | RouteParams }) {
  const { clubId } = await getParams(context);
  const admin = await getCurrentAdminForClub(req, clubId);

  if (!admin || (!admin.is_super_admin && !admin.can_manage_members)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const firstName = String(body?.firstName ?? '').trim();
  const lastName = String(body?.lastName ?? '').trim();
  const email = normaliseEmail(body?.email);
  const internalNote = String(body?.internalNote ?? '').trim() || null;

  if (!firstName || !lastName || !email) {
    return NextResponse.json(
      { error: 'First name, surname and email address are required.' },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const { data: existingHousehold } = await supabaseServerClient
    .from('households')
    .select('id, name')
    .eq('club_id', clubId)
    .or(`primary_email.ilike.${email},secondary_email.ilike.${email}`)
    .limit(1)
    .maybeSingle();

  if (existingHousehold) {
    return NextResponse.json(
      {
        error: 'This email address is already connected to a household.',
        householdId: existingHousehold.id,
      },
      { status: 409 },
    );
  }

  const { data: existingInvitation } = await supabaseServerClient
    .from('membership_invitations')
    .select('id, status')
    .eq('club_id', clubId)
    .eq('email', email)
    .in('status', ['draft', 'sent', 'opened', 'in_progress'])
    .maybeSingle();

  if (existingInvitation) {
    return NextResponse.json(
      { error: 'There is already an active invitation for this email address.' },
      { status: 409 },
    );
  }

  const { data: club, error: clubError } = await supabaseServerClient
    .from('clubs')
    .select('active_season_year')
    .eq('id', clubId)
    .single();

  if (clubError || !club) {
    return NextResponse.json({ error: 'Club not found.' }, { status: 404 });
  }

  const seasonYear = Number(club.active_season_year) || new Date().getFullYear() + 1;
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error } = await supabaseServerClient
    .from('membership_invitations')
    .insert({
      club_id: clubId,
      season_year: seasonYear,
      account_holder_first_name: firstName,
      account_holder_last_name: lastName,
      email,
      internal_note: internalNote,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: admin.user_id,
    })
    .select(`
      id,
      season_year,
      account_holder_first_name,
      account_holder_last_name,
      email,
      internal_note,
      status,
      expires_at,
      created_at
    `)
    .single();

  if (error || !invitation) {
    console.error('Create membership invitation error', error);
    return NextResponse.json({ error: 'Failed to create the invitation.' }, { status: 500 });
  }

  return NextResponse.json(
    {
      invitation,
      invitationUrl: invitationUrl(req, invitation.id, token),
    },
    { status: 201 },
  );
}

