// app/admin/debug/whoami/page.tsx

import { createClient } from '@/lib/supabase/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

const RAINHILL_CLUB_ID = '42f3aeee-804e-4321-8cde-6b4d23fe78cc';

export default async function WhoAmIPage() {
  const supabaseAuth = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError) {
    console.error('Auth error', authError);
  }

  if (!user) {
    return (
      <main className="max-w-xl mx-auto mt-10 space-y-4">
        <h1 className="text-xl font-semibold">Who am I?</h1>
        <p className="text-sm text-slate-700">
          No Supabase user is logged in. The server does not see an auth
          session.
        </p>
      </main>
    );
  }

  // Look up this user’s admin record for Rainhill
  const { data: admins, error: adminError } = await supabaseServerClient
    .from('club_admin_users')
    .select('*')
    .eq('user_id', user.id)
    .eq('club_id', RAINHILL_CLUB_ID);

  if (adminError) {
    console.error('club_admin_users error', adminError);
  }

  const admin = admins && admins[0];

  return (
    <main className="max-w-xl mx-auto mt-10 space-y-6">
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">Who am I?</h1>
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm space-y-1">
          <p>
            <span className="font-medium">User ID:</span> {user.id}
          </p>
          <p>
            <span className="font-medium">Email:</span> {user.email}
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Rainhill admin record</h2>

        {!admin && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No row found in <code>club_admin_users</code> for this user and
            Rainhill. This user has <strong>no admin permissions</strong> for
            the club.
          </div>
        )}

        {admin && (
          <div className="rounded-md border border-slate-200 bg-white p-4 text-sm space-y-1">
            <p>
              <span className="font-medium">Email (admin row):</span>{' '}
              {admin.email}
            </p>
            <p>
              <span className="font-medium">is_super_admin:</span>{' '}
              {admin.is_super_admin ? 'true' : 'false'}
            </p>
            <p>
              <span className="font-medium">can_view_dashboard:</span>{' '}
              {admin.can_view_dashboard ? 'true' : 'false'}
            </p>
            <p>
              <span className="font-medium">can_view_juniors:</span>{' '}
              {admin.can_view_juniors ? 'true' : 'false'}
            </p>
            <p>
              <span className="font-medium">can_edit_juniors:</span>{' '}
              {admin.can_edit_juniors ? 'true' : 'false'}
            </p>
            <p>
              <span className="font-medium">can_manage_members:</span>{' '}
              {admin.can_manage_members ? 'true' : 'false'}
            </p>
            <p>
              <span className="font-medium">can_manage_safeguarding:</span>{' '}
              {admin.can_manage_safeguarding ? 'true' : 'false'}
            </p>
            <p>
              <span className="font-medium">can_view_payments:</span>{' '}
              {admin.can_view_payments ? 'true' : 'false'}
            </p>
            <p>
              <span className="font-medium">can_edit_payments:</span>{' '}
              {admin.can_edit_payments ? 'true' : 'false'}
            </p>
            <p>
              <span className="font-medium">can_manage_plans:</span>{' '}
              {admin.can_manage_plans ? 'true' : 'false'}
            </p>
            <p>
              <span className="font-medium">can_manage_pricing:</span>{' '}
              {admin.can_manage_pricing ? 'true' : 'false'}
            </p>
            <p>
              <span className="font-medium">can_manage_admins:</span>{' '}
              {admin.can_manage_admins ? 'true' : 'false'}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
