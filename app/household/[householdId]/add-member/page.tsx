// app/household/[householdId]/add-member/page.tsx

import { supabaseServerClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import AddMemberForm from './AddMemberForm';

type PageParams = {
  householdId: string;
};

type PageProps = {
  params: Promise<PageParams>;
  searchParams?: { type?: string | string[] };
};

export default async function AddMemberPage({ params, searchParams }: PageProps) {
  const supabase = supabaseServerClient;

  // Next 16: params is a Promise
  const resolvedParams = await params;
  const householdId = resolvedParams.householdId;

  if (!householdId || householdId === 'undefined') {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <h1 className="text-xl font-semibold mb-2">Household not available</h1>
        <p className="text-sm text-red-700">
          No valid household id was provided in the URL.
        </p>
      </div>
    );
  }

  // Work out requested member type from the query string
  const rawType = searchParams?.type;
  const normalised =
    Array.isArray(rawType) ? rawType[0] : rawType;
  const initialType =
    normalised === 'supporter' ? 'supporter' : 'player';

  // Load household so we know club_id
  const { data: household, error } = await supabase
    .from('households')
    .select('id, club_id, name, primary_email')
    .eq('id', householdId)
    .single();

  if (error || !household) {
    console.error('Add-member household load error', error);
    return notFound();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">
        {initialType === 'player'
          ? 'Add a playing member'
          : 'Add a social / supporter member'}
      </h1>
      <p className="text-sm text-gray-600">
        This person will be linked to{' '}
        <span className="font-medium">
          {household.name || household.primary_email}
        </span>{' '}
        in your household. You&apos;ll be able to manage their memberships
        from your household dashboard.
      </p>

      <AddMemberForm
        clubId={household.club_id}
        householdId={household.id}
        initialType={initialType}
      />
    </div>
  );
}
