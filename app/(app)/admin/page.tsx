// app/admin/page.tsx
// app/admin/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

type ClubAdminRow = {
  club_id: string;
  is_super_admin: boolean;
  can_view_dashboard: boolean;
  can_manage_admins: boolean;
};

type Club = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  primary_colour: string | null;
  secondary_colour: string | null;
};

export default async function AdminLandingPage() {
  // 1) Check auth using SSR client (reads cookies)
  const supabaseAuth = await createClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/admin');
  }

  // 2) Load all clubs this user is an admin for (service-role client),
  // matching either by user_id (preferred) OR email (fallback).
  let adminQuery = supabaseServerClient
    .from('club_admin_users')
    .select(
      'club_id, is_super_admin, can_view_dashboard, can_manage_admins',
    );

  if (user.id && user.email) {
    adminQuery = adminQuery.or(
      `user_id.eq.${user.id},email.eq.${user.email}`,
    );
  } else if (user.id) {
    adminQuery = adminQuery.eq('user_id', user.id);
  } else if (user.email) {
    adminQuery = adminQuery.eq('email', user.email);
  }

  const { data: adminRows, error: adminError } = await adminQuery;

  if (adminError) {
    console.error('Error loading admin clubs', adminError);
    return (
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">
          Club admin
        </h1>
        <p className="mt-4 text-sm text-red-600">
          Sorry, something went wrong loading your club admin access.
        </p>
      </main>
    );
  }

  const admins = (adminRows as ClubAdminRow[]) || [];

  if (admins.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <section>
          <h1 className="text-2xl font-semibold text-slate-900">
            Club admin
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            You’re signed in as{' '}
            <span className="font-mono">{user.email}</span>, but you
            don’t have admin access for any clubs yet.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          If you think this is a mistake, ask your club’s super admin to
          add you on the{' '}
          <span className="font-semibold">Admins &amp; Roles</span> page.
        </section>
      </main>
    );
  }

  // 3) Fetch club details for those club_ids (service-role client)
  const clubIds = admins.map((a) => a.club_id);

  let clubs: Club[] = [];

  if (clubIds.length > 0) {
    const { data: clubRows, error: clubsError } =
      await supabaseServerClient
        .from('clubs')
        .select(
          'id, name, slug, logo_url, primary_colour, secondary_colour',
        )
        .in('id', clubIds);

    if (clubsError) {
      console.error('Error loading club details', clubsError);
    }

    clubs = (clubRows as Club[]) || [];
  }

  function findClub(clubId: string): Club | undefined {
    return clubs.find((c) => c.id === clubId);
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Club admin
        </h1>
        <p className="text-sm text-slate-600">
          Signed in as{' '}
          <span className="font-mono">{user.email}</span>. Select a club
          to open its admin dashboard.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {admins.map((admin) => {
          const club = findClub(admin.club_id);

          const clubName = club?.name ?? 'Unknown club';
          const clubSlug = club?.slug ?? 'club';
          const logoUrl = club?.logo_url ?? null;

          const roleSummary = admin.is_super_admin
            ? 'Super admin · full access'
            : admin.can_manage_admins
            ? 'Admin · can manage admins'
            : admin.can_view_dashboard
            ? 'Admin · dashboard access'
            : 'Admin';

          return (
            <div
              key={admin.club_id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={clubName}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
                    {clubName
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 3)
                      .toUpperCase()}
                  </div>
                )}

                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {clubName}
                  </h2>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    {clubSlug}
                  </p>
                  <p className="text-xs text-slate-600">{roleSummary}</p>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="text-[11px] text-slate-500">
                  Manage juniors, memberships, payments and admins for this
                  club.
                </div>
                <Link
                  href={`/admin/clubs/${admin.club_id}/dashboard`}
                  className="ml-3 inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Open club admin
                </Link>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}