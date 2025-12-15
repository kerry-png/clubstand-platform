// app/club/[slug]/join/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getClubFromRequest } from '@/lib/branding/getClubFromRequest';

type PageProps = {
  params: Promise<{ slug: string }>;
};

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_pennies: number;
  is_player_plan: boolean;
  is_junior_only: boolean;
  is_household_plan: boolean;
};

export default async function JoinPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1) Require login (keep existing behaviour)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/club/${slug}/join`);
  }

  // 2) Load club via resolver (domain -> fallback slug)
  const { club } = await getClubFromRequest(slug);

  if (!club) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--brand-primary)' }}
        >
          Club not found
        </h1>
        <p className="text-sm text-gray-700">
          We couldn&apos;t find a club with slug{' '}
          <span className="font-mono">{slug}</span>.
        </p>
      </main>
    );
  }

  // 3) Load plans (unchanged)
  const { data: plans, error: plansError } = await supabase
    .from('membership_plans')
    .select(
      `
      id,
      name,
      slug,
      description,
      price_pennies,
      is_player_plan,
      is_junior_only,
      is_household_plan
    `,
    )
    .eq('club_id', club.id)
    .eq('is_visible_online', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (plansError) {
    console.error('Error loading membership plans', plansError);
  }

  const visiblePlans = (plans ?? []).filter((p: any) => !p.is_household_plan);

  const adultPlans = visiblePlans.filter(
    (p) => p.is_player_plan && !p.is_junior_only,
  );
  const juniorPlans = visiblePlans.filter(
    (p) => p.is_player_plan && p.is_junior_only,
  );
  const socialPlans = visiblePlans.filter(
    (p) => !p.is_player_plan && !p.is_junior_only,
  );

  const hasAny = visiblePlans.length > 0;

  const formatPrice = (pennies: number) => {
    const pounds = pennies / 100;
    const formatted = pounds.toFixed(2);
    return formatted.endsWith('.00')
      ? `£${formatted.slice(0, -3)}`
      : `£${formatted}`;
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1
          className="text-3xl font-semibold"
          style={{ color: 'var(--brand-primary)' }}
        >
          Join {club.name}
        </h1>
        <p className="text-sm text-gray-700">
          Choose the type of membership you want to start with. You&apos;ll be
          able to manage your household and add family members afterwards.
        </p>
        <p className="text-xs text-gray-500">
          Signed in as <span className="font-mono">{user.email}</span>
        </p>
      </header>

      {!hasAny && (
        <p className="text-sm text-red-700">
          This club doesn&apos;t currently have any online membership plans
          available.
        </p>
      )}

      {hasAny && (
        <section className="space-y-6">
          {/* Adult */}
          {adultPlans.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Adult memberships
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {adultPlans.map((plan: PlanRow) => (
                  <Link
                    key={plan.id}
                    href={`/club/${club.slug}/join/details?plan=${plan.id}`}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow p-5 space-y-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3
                          className="text-lg font-semibold"
                          style={{ color: 'var(--brand-primary)' }}
                        >
                          {plan.name}
                        </h3>
                        <span className="text-sm font-semibold">
                          {formatPrice(plan.price_pennies)}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-gray-600">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <span
                        className="inline-flex px-3 py-1 rounded-md text-xs text-white"
                        style={{ background: 'var(--brand-primary)' }}
                      >
                        Join as {plan.name}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Juniors */}
          {juniorPlans.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Junior memberships
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {juniorPlans.map((plan: PlanRow) => (
                  <Link
                    key={plan.id}
                    href={`/club/${club.slug}/join/details?plan=${plan.id}`}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow p-5 space-y-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3
                          className="text-lg font-semibold"
                          style={{ color: 'var(--brand-primary)' }}
                        >
                          {plan.name}
                        </h3>
                        <span className="text-sm font-semibold">
                          {formatPrice(plan.price_pennies)}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-gray-600">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <span
                        className="inline-flex px-3 py-1 rounded-md text-xs text-white"
                        style={{ background: 'var(--brand-primary)' }}
                      >
                        Join with this junior membership
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Social */}
          {socialPlans.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Social memberships
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {socialPlans.map((plan: PlanRow) => (
                  <Link
                    key={plan.id}
                    href={`/club/${club.slug}/join/details?plan=${plan.id}`}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow p-5 space-y-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3
                          className="text-lg font-semibold"
                          style={{ color: 'var(--brand-primary)' }}
                        >
                          {plan.name}
                        </h3>
                        <span className="text-sm font-semibold">
                          {formatPrice(plan.price_pennies)}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="text-xs text-gray-600">
                          {plan.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <span
                        className="inline-flex px-3 py-1 rounded-md text-xs text-white"
                        style={{ background: 'var(--brand-primary)' }}
                      >
                        Join with this membership
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <footer className="text-xs text-gray-500">
        After starting your membership, you&apos;ll be able to manage your
        household and add family members.
      </footer>
    </main>
  );
}
