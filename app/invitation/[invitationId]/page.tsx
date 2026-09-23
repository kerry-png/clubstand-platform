// app/invitation/[invitationId]/page.tsx

import { createHash } from 'node:crypto';
import { supabaseServerClient } from '@/lib/supabaseServer';

type PageProps = {
  params: Promise<{ invitationId: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

type InvitationView = {
  id: string;
  account_holder_first_name: string;
  account_holder_last_name: string;
  email: string;
  season_year: number;
  status: string;
  expires_at: string;
  club: {
    id: string;
    name: string;
    logo_url: string | null;
    primary_colour: string | null;
    secondary_colour: string | null;
    accent_colour: string | null;
  } | null;
};

function InvitationMessage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
          C
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <div className="mt-3 text-sm leading-6 text-slate-600">{children}</div>
      </section>
    </main>
  );
}

export default async function InvitationPage({ params, searchParams }: PageProps) {
  const { invitationId } = await params;
  const query = await searchParams;
  const token = Array.isArray(query.token) ? query.token[0] : query.token;

  if (!token) {
    return (
      <InvitationMessage title="This invitation link is incomplete">
        Ask the club administrator to send you a new invitation link.
      </InvitationMessage>
    );
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { data, error } = await supabaseServerClient
    .from('membership_invitations')
    .select(`
      id,
      account_holder_first_name,
      account_holder_last_name,
      email,
      season_year,
      status,
      expires_at,
      club:clubs (
        id,
        name,
        logo_url,
        primary_colour,
        secondary_colour,
        accent_colour
      )
    `)
    .eq('id', invitationId)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error || !data) {
    return (
      <InvitationMessage title="This invitation link is not valid">
        Check that you opened the complete link. If it still does not work, ask the club administrator for a new invitation.
      </InvitationMessage>
    );
  }

  const invitation = data as unknown as InvitationView;
  const expired = new Date(invitation.expires_at).getTime() <= Date.now();

  if (invitation.status === 'revoked') {
    return (
      <InvitationMessage title="This invitation has been withdrawn">
        Contact the club if you think you should still be able to register.
      </InvitationMessage>
    );
  }

  if (expired || invitation.status === 'expired') {
    if (invitation.status !== 'expired') {
      await supabaseServerClient
        .from('membership_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
    }
    return (
      <InvitationMessage title="This invitation has expired">
        Ask the club administrator to issue a new invitation link.
      </InvitationMessage>
    );
  }

  if (invitation.status === 'completed') {
    return (
      <InvitationMessage title="Registration already completed">
        This invitation has already been used. You can now sign in to ClubStand with your account details.
      </InvitationMessage>
    );
  }

  if (invitation.status === 'draft' || invitation.status === 'sent') {
    await supabaseServerClient
      .from('membership_invitations')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)
      .in('status', ['draft', 'sent']);
  }

  const club = invitation.club;
  const primary = club?.primary_colour || '#0f172a';
  const secondary = club?.secondary_colour || '#f8fafc';
  const fullName = `${invitation.account_holder_first_name} ${invitation.account_holder_last_name}`;

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: secondary }}
    >
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            {club?.logo_url ? (
              <img
                src={club.logo_url}
                alt={`${club.name} logo`}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-contain"
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white"
                style={{ background: primary }}
              >
                {club?.name?.charAt(0) || 'C'}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-500">Membership invitation</p>
              <p className="text-lg font-semibold text-slate-900">{club?.name || 'Your club'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-8 sm:px-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              You&apos;re invited to join {club?.name || 'the club'}
            </h1>
            <p className="mt-3 leading-7 text-slate-600">
              Hello {invitation.account_holder_first_name}. The club has approved your household to register for the {invitation.season_year} season using ClubStand.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-slate-500">Account holder</dt>
                <dd className="mt-1 font-semibold text-slate-900">{fullName}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Email address</dt>
                <dd className="mt-1 break-all font-semibold text-slate-900">{invitation.email}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">What happens next?</h2>
            <ol className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              <li><span className="font-semibold text-slate-900">1.</span> Create your secure ClubStand login.</li>
              <li><span className="font-semibold text-slate-900">2.</span> Add your household and member details.</li>
              <li><span className="font-semibold text-slate-900">3.</span> Review the membership information and club consents.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
            This is the first invitation page for review. The secure registration form will be connected in the next step.
          </div>
        </div>
      </section>
    </main>
  );
}
