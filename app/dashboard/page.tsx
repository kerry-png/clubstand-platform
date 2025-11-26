// app/dashboard/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/dashboard');
  }

  let hasHousehold = false;

  if (user.email) {
    const { data: household, error } = await supabase
      .from('households')
      .select('id')
      .ilike('primary_email', user.email) // case-insensitive
      .maybeSingle();

    if (!error && household) {
      hasHousehold = true;
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <section>
        <h1 className="text-3xl font-semibold mb-2">Your club portal</h1>
        <p className="text-sm text-gray-600">
          Signed in as <span className="font-mono">{user.email}</span>
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {/* Cricket membership card */}
        <div className="border rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Cricket membership</h2>
            <p className="text-sm text-gray-600">
              {hasHousehold
                ? 'View and manage your household, members and memberships.'
                : 'Set up or renew your household’s cricket membership.'}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <Link
              href="/household"
              className="block text-center w-full px-3 py-2 rounded-md bg-black text-white text-sm"
            >
              {hasHousehold ? 'View my membership' : 'Check my membership'}
            </Link>
            {!hasHousehold && (
              <Link
                href="/membership"
                className="block text-center w-full px-3 py-2 rounded-md border text-sm"
              >
                Become a cricket member
              </Link>
            )}
          </div>
        </div>

        {/* Hundred Club card */}
        <div className="border rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Hundred Club</h2>
            <p className="text-sm text-gray-600">
              Support the club with a monthly prize draw. Manage your numbers and payments here.
            </p>
          </div>

          <div className="mt-4">
            <Link
              href="/hundred-club"
              className="block text-center w-full px-3 py-2 rounded-md border text-sm"
            >
              Go to Hundred Club
            </Link>
          </div>
        </div>

        {/* LMS / other games card */}
        <div className="border rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">LMS & other games</h2>
            <p className="text-sm text-gray-600">
              Enter fantasy leagues and score predictors linked to your club.
            </p>
          </div>

          <div className="mt-4">
            <Link
              href="/lms"
              className="block text-center w-full px-3 py-2 rounded-md border text-sm"
            >
              Go to LMS
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
