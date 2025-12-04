//app/club/[slug]/join/safeguarding/page.tsx
import SafeguardingStepClient from '@/components/safeguarding/SafeguardingStepClient';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    member?: string;
    plan?: string;
  }>;
};

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

  // Lookup the club by slug
  const { data: club, error: clubErr } = await supabase
    .from('clubs')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (clubErr || !club) {
    console.error('Failed to load club for safeguarding step', clubErr);
    return redirect(`/club/${slug}/join`);
  }

  // Load the member record – we need DOB / role for context
  const { data: member, error: memberErr } = await supabase
    .from('members')
    .select('id, dob, gender, role')
    .eq('id', memberId)
    .maybeSingle();

  if (memberErr || !member) {
    console.error('Failed to load member for safeguarding step', memberErr);
    return redirect(`/club/${slug}/join/details?plan=${planId}`);
  }

  // Derive safeguarding context ("junior" | "adult" | "parent")
  let context: 'junior' | 'adult' | 'parent' = 'adult';

  if (member.role === 'parent') {
    context = 'parent';
  } else {
    const age = member.dob ? Math.floor((Date.now() - new Date(member.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
    if (age !== null && age < 18) {
      context = 'junior';
    }
  }

  // Household lookup (used for household-level questions)
  const { data: householdMember } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('member_id', memberId)
    .maybeSingle();

  const householdId = householdMember?.household_id ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold">
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