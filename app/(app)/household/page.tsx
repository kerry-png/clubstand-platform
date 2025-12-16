// app/(app)/household/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HouseholdRedirectPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirectTo=/household');

  if (!user.email) {
    console.error('Logged-in user has no email – cannot look up household');
    redirect('/membership');
  }

  const { data: households, error } = await supabase
    .from('households')
    .select(
      `
      id,
      club_id,
      name,
      created_at,
      club:clubs (
        id,
        name,
        slug,
        logo_url
      )
    `,
    )
    .or(`primary_email.ilike.${user.email},secondary_email.ilike.${user.email}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Household lookup error', error);
    redirect('/membership');
  }

  if (!households || households.length === 0) {
    redirect('/membership');
  }

  if (households.length === 1) {
    redirect(`/household/${households[0].id}`);
  }

  // Multiple households for the same email → let them choose
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">My household</h1>
      <p className="text-sm text-slate-600">
        You’ve got more than one household linked to this email. Choose one:
      </p>

      <div className="grid gap-3">
        {households.map((h: any) => {
          const clubName = h?.club?.name ?? 'Club';
          const label = h?.name ? `${clubName} — ${h.name}` : clubName;

          return (
            <Link
              key={h.id}
              href={`/household/${h.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
            >
              <div className="text-sm font-semibold text-slate-900">{label}</div>
              <div className="mt-1 text-xs text-slate-500">
                Open household dashboard
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}