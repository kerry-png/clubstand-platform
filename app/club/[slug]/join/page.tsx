// app/club/[slug]/join/page.tsx
import { createClient } from '@/lib/supabase/server';
import JoinForm from './JoinForm';

type PageProps = {
  params: { slug: string };
};

export default async function JoinPage({ params }: PageProps) {
  const supabase = await createClient();

  // TEMP: hard-code Rainhill CC club details so we don't depend on slug/RLS yet
  const club = {
    id: '42f3aeee-804e-4321-8cde-6b4d23fe78cc',
    name: 'Rainhill Cricket Club',
    slug: params.slug,
  };

  // Load only junior player plans that are visible online
  const { data: plans, error: plansError } = await supabase
    .from('membership_plans')
    .select('id, name, slug')
    .eq('club_id', club.id)
    .eq('is_player_plan', true)
    .eq('is_junior_only', true)
    .eq('is_visible_online', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (plansError) {
    console.error('Plans load error', plansError);
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-semibold">
        Join {club.name} – Junior Membership
      </h1>
      <p className="text-sm text-gray-600">
        Use this form to register one junior player in your household.
        Later, you&apos;ll be able to add more family members from your account.
      </p>

      <JoinForm clubId={club.id} plans={plans ?? []} />
    </div>
  );
}
