// app/club/[slug]/join/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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

// Temporary: hard-code Rainhill while we’re still in single-club mode
const RAINHILL_CLUB_ID = '42f3aeee-804e-4321-8cde-6b4d23fe78cc';

export default async function JoinPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1) Require login
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/club/${slug}/join`);
  }

  // 2) Try to load club by slug
  const { data: clubRow, error: clubError } = await supabase
    .from('clubs')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle();

  let club = clubRow;

  // If no club found but slug is 'rainhill', fall back to known ID/name
  if (!club && slug === 'rainhill') {
    console.warn(
      'No club row found for slug "rainhill" – using fallback Rainhill club config.',
    );
    club = {
      id: RAINHILL_CLUB_ID,
      name: 'Rainhill Cricket Club',
      slug,
    } as any;
  }

  if ((clubError || !club) && slug !== 'rainhill') {
    console.error('Club lookup error', clubError);
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-2">Club not found</h1>
        <p className="text-sm text-gray-700">
          We couldn&apos;t find a club with slug{' '}
          <span className="font-mono">{slug}</span>.
        </p>
      </main>
    );
  }

  // 3) Load all visible membership plans for this club
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
    .eq('club_id', club!.id)
    .eq('is_visible_online', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (plansError) {
    console.error('Plans load error', plansError);
  }

  // Hide household plans (e.g. family cap) from the selection UI for now
  const visiblePlans = (plans ?? []).filter(
    (p: any) => !p.is_household_plan,
  ) as PlanRow[];

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
        <h1 className="text-3xl font-semibold">Join {club!.name}</h1>
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
          available. Please contact the club directly to join.
        </p>
      )}

      {hasAny && (
        <section className="space-y-6">
          {/* Adult memberships */}
          {adultPlans.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                Adult cricket memberships
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {adultPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/club/${club!.slug}/join/details?plan=${plan.id}`}
                    className="border rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-base font-semibold">
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
                      <span className="inline-flex px-3 py-1 rounded-md text-xs bg-black text-white">
                        Join as {plan.name}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Junior memberships */}
          {juniorPlans.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Junior memberships</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {juniorPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/club/${club!.slug}/join/details?plan=${plan.id}`}
                    className="border rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-base font-semibold">
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
                      <span className="inline-flex px-3 py-1 rounded-md text-xs bg-black text-white">
                        Join with this junior membership
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Social / non-playing memberships */}
          {socialPlans.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Social & non-playing</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {socialPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/club/${club!.slug}/join/details?plan=${plan.id}`}
                    className="border rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-base font-semibold">
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
                      <span className="inline-flex px-3 py-1 rounded-md text-xs bg-black text-white">
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
        household and add family members from your dashboard.
      </footer>
    </main>
  );
}
