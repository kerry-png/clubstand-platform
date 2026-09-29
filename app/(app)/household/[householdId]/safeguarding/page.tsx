// app/household/[householdId]/safeguarding/page.tsx
import { supabaseServerClient } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
import SafeguardingStepClient from '@/components/safeguarding/SafeguardingStepClient';
import { requireHouseholdAccess } from '@/lib/auth/householdAccess';
import { DEFAULT_MEMBERSHIP_SETTINGS, isJunior } from '@/lib/membership/rules';

type PageProps = {
  params: Promise<{ householdId: string }>;
  searchParams: Promise<{ member?: string; returnTo?: string }>;
};

export default async function HouseholdSafeguardingPage({
  params,
  searchParams,
}: PageProps) {
  const { householdId } = await params;
  const { member: memberId, returnTo } = await searchParams;

  if (!memberId) {
    return redirect(`/household/${householdId}?setup=1`);
  }

  const access = await requireHouseholdAccess(householdId);
  if (!access.ok) return notFound();

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
    .eq('household_id', householdId)
    .maybeSingle();

  if (memberError || !member) {
    console.error('Household safeguarding: member not found', memberError);
    return redirect(`/household/${householdId}?setup=1`);
  }

  // Derive safeguarding context
  let context: 'junior' | 'adult' | 'parent' | 'household' = 'adult';

  if (member.member_type === 'supporter') {
    context = 'parent';
  } else if (member.date_of_birth) {
    const { data: storedSettings } = await supabase
      .from('club_membership_settings')
      .select('*')
      .eq('club_id', household.club_id)
      .maybeSingle();
    const settings = { ...DEFAULT_MEMBERSHIP_SETTINGS, ...(storedSettings ?? {}) };
    if (isJunior(member.date_of_birth, new Date(), settings) === true) {
      context = 'junior';
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
          href={returnTo === 'renew' ? `/household/${householdId}/renew` : `/household/${householdId}?setup=1`}
          className="underline underline-offset-2"
        >
          {returnTo === 'renew' ? 'return to renewal' : 'return to your household dashboard'}
        </a>
        .
      </p>

    </div>
  );
}
