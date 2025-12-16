// app/household/[householdId]/members/[memberId]/edit/page.tsx

import { supabaseServerClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import EditMemberForm from './EditMemberForm';

type RouteParams = {
  householdId: string;
  memberId: string;
};

type PageProps = {
  params: Promise<RouteParams>;
};

export default async function EditMemberPage(props: PageProps) {
  const supabase = supabaseServerClient;

  const resolvedParams = await props.params;
  const { householdId, memberId } = resolvedParams;

  if (!householdId || !memberId) {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <h1 className="text-xl font-semibold mb-2">Member not available</h1>
        <p className="text-sm text-red-700">
          The link to this member is missing some information.
        </p>
      </div>
    );
  }

  const { data: member, error } = await supabase
    .from('members')
    .select(
      `
        id,
        household_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        member_type,
        email,
        phone
      `,
    )
    .eq('id', memberId)
    .eq('household_id', householdId)
    .single();

  if (error || !member) {
    console.error('Edit member load error', error);
    return notFound();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">
        Edit details – {member.first_name} {member.last_name}
      </h1>
      <p className="text-sm text-gray-600">
        Update this person&apos;s basic details. If anything looks incorrect
        with their membership or teams, please contact the club admin.
      </p>

      <EditMemberForm
        householdId={householdId}
        memberId={member.id}
        initialValues={{
          first_name: member.first_name ?? '',
          last_name: member.last_name ?? '',
          date_of_birth: member.date_of_birth ?? '',
          gender: member.gender ?? '',
          member_type: member.member_type ?? 'member',
          email: member.email ?? '',
          phone: member.phone ?? '',
        }}
      />
    </div>
  );
}
