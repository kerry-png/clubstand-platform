// app/club/[slug]/join/details/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SelfDetailsForm from '../SelfDetailsForm';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function JoinDetailsPage(props: PageProps) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  const planRaw = searchParams?.plan;
  const planId = Array.isArray(planRaw) ? planRaw[0] : planRaw;

  if (!planId) {
    redirect(`/club/${slug}/join`);
  }

  // Require user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/club/${slug}/join/details?plan=${planId}`);
  }

  // Load club
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle();

  // Fallback for Rainhill single-club mode
  const RAINHILL_CLUB_ID = '42f3aeee-804e-4321-8cde-6b4d23fe78cc';

  let clubToUse = club;

  if (!clubToUse && slug === 'rainhill') {
    console.warn(
      'No club row found for slug "rainhill" on details page – using fallback Rainhill club config.',
    );
    clubToUse = {
      id: RAINHILL_CLUB_ID,
      name: 'Rainhill Cricket Club',
      slug,
    } as any;
  }

  if ((clubError || !clubToUse) && slug !== 'rainhill') {
    console.error('Club lookup error on details page', clubError);
    redirect(`/club/${slug}/join`);
  }

  // Load plan
  const { data: plan, error: planError } = await supabase
    .from('membership_plans')
    .select(
      `
        id,
        name,
        description,
        price_pennies,
        is_player_plan,
        is_junior_only
      `,
    )
    .eq('id', planId)
    .eq('club_id', clubToUse!.id)
    .maybeSingle();

  if (planError || !plan) {
    console.error('Plan lookup error', planError);
    redirect(`/club/${slug}/join`);
  }

  const formatPrice = (pennies: number) => {
    const pounds = pennies / 100;
    const formatted = pounds.toFixed(2);
    return formatted.endsWith('.00')
      ? `£${formatted.slice(0, -3)}`
      : `£${formatted}`;
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Your details</h1>
        <p className="text-sm text-gray-700">
          You&apos;re joining {clubToUse!.name} with{' '}
          <span className="font-semibold">{plan.name}</span> (
          {formatPrice(plan.price_pennies)} per season).
        </p>
        <p className="text-xs text-gray-500">
          Signed in as <span className="font-mono">{user.email}</span>
        </p>
      </header>

      <SelfDetailsForm
        clubId={clubToUse!.id}
        planId={plan.id}
        planName={plan.name}
        planPricePennies={plan.price_pennies}
        defaultEmail={user.email ?? ''}
      />
    </main>
  );
}
