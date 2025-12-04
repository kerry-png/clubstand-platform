// app/household/[householdId]/safeguarding/page.tsx
import { supabaseServerClient } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
import SafeguardingStepClient from '@/components/safeguarding/SafeguardingStepClient';

type PageProps = {
  params: Promise<{ householdId: string }>;
  searchParams: Promise<{ member?: string }>;
};

export default async function HouseholdSafeguardingPage({
  params,
  searchParams,
}: PageProps) {
  const { householdId } = await params;
  const { member: memberId } = await searchParams;

  if (!memberId) {
    return redirect(`/household/${householdId}?setup=1`);
  }

  const supabase = supabaseServerClient;

  // Load household (for club_id)
  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('id, club_id, name')
    .eq('id', householdId)
    .maybeSingle();

  if (householdError || !household) {
    console.error('Household safeguarding: household not found', householdError);
    return notFound();
  }

  // Load member for context (dob / type)
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, first_name, last_name, date_of_birth, member_type')
    .eq('id', memberId)
    .maybeSingle();

  if (memberError || !member) {
    console.error('Household safeguarding: member not found', memberError);
    return redirect(`/household/${householdId}?setup=1`);
  }

  // Derive safeguarding context
  let context: 'junior' | 'adult' | 'parent' | 'household' = 'adult';

  if (member.member_type === 'supporter') {
    context = 'parent';
  } else {
    const dob = member.date_of_birth ? new Date(member.date_of_birth) : null;
    if (dob) {
      const age =
        (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) context = 'junior';
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">
          Safeguarding & consents for{' '}
          {`${member.first_name ?? ''} ${member.last_name ?? ''}`.trim()}
        </h1>
        <p className="text-sm text-slate-600">
          Please review and answer the safeguarding questions below. Your
          responses help the club keep players safe and follow safeguarding
          policies.
        </p>
      </header>

      <SafeguardingStepClient
        clubId={household.club_id}
        memberId={member.id}
        householdId={household.id}
        context={context}
      />
      <p className="text-xs text-slate-500 mt-2">
        When you’ve finished, you can{' '}
        <a
          href={`/household/${householdId}?setup=1`}
          className="underline underline-offset-2"
        >
          return to your household dashboard
        </a>
        .
      </p>

    </div>
  );
}
