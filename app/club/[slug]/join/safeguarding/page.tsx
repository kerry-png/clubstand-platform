// app/club/[slug]/join/safeguarding/page.tsx
import SafeguardingStepClient from '@/components/safeguarding/SafeguardingStepClient';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { getClubFromRequest } from '@/lib/branding/getClubFromRequest';
import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    member?: string;
    plan?: string;
  }>;
};

function ageOnDate(dob: string, onDate: Date) {
  const birth = new Date(dob);
  let age = onDate.getFullYear() - birth.getFullYear();

  const m = onDate.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && onDate.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

export default async function SafeguardingPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { member: memberId, plan: planId } = await searchParams;

  if (!memberId || !planId) {
    return redirect(`/club/${slug}/join`);
  }

  const supabase = supabaseServerClient;

  // Use the single resolver (domain -> fallback slug)
  const { club } = await getClubFromRequest(slug);

  if (!club) {
    console.error('Failed to resolve club for safeguarding step');
    return redirect(`/club/${slug}/join`);
  }

  // Load the member record – we need DOB / member_type for context
  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('id, club_id, date_of_birth, gender, member_type')
    .eq('id', memberId)
    .eq('club_id', club.id)
    .maybeSingle();

  if (memberErr || !member) {
    console.error('Failed to load member for safeguarding step', memberErr);
    return redirect(`/club/${slug}/join/details?plan=${planId}`);
  }

  // Decide the season cut-off date for junior/adult:
  // playing season YEAR uses age on 1st September of the previous year.
  const now = new Date();
  const seasonYear =
    (club.active_season_year as number | null) ?? now.getFullYear() + 1;
  const cutOff = new Date(seasonYear - 1, 8, 1); // 8 = September (0-indexed)

  // Derive safeguarding context ("junior" | "adult" | "parent")
  let context: 'junior' | 'adult' | 'parent' = 'adult';

  // If the record is explicitly a guardian/parent type, treat as parent context.
  // Otherwise if DOB indicates under-18 at season cut-off, treat as junior.
  const mt = (member.member_type ?? '').toString().toLowerCase();
  if (mt === 'parent' || mt === 'guardian') {
    context = 'parent';
  } else if (member.date_of_birth) {
    const age = ageOnDate(member.date_of_birth, cutOff);
    if (age < 18) context = 'junior';
  }

  // Household lookup (used for household-level questions)
  const { data: householdMember, error: hmErr } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('member_id', memberId)
    .maybeSingle();

  if (hmErr) {
    console.error('Failed to load household_members for safeguarding step', hmErr);
  }

  const householdId = householdMember?.household_id ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1
        className="text-xl font-semibold"
        style={{ color: 'var(--brand-primary)' }}
      >
        Safeguarding & consents
      </h1>
      <p className="text-slate-600 text-sm">
        These questions must be completed before you can continue with your membership.
      </p>

      <SafeguardingStepClient
        clubId={club.id}
        memberId={memberId}
        householdId={householdId}
        context={context}
      />
    </div>
  );
}
