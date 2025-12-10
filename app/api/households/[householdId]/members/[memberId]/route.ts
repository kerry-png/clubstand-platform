// app/api/households/[householdId]/members/[memberId]/route.ts
import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

type RouteParams = {
  householdId: string;
  memberId: string;
};

export async function PATCH(
  req: Request,
  context:
    | { params: RouteParams }
    | { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;

  // Next 16: params may be a Promise
  const rawParams: any = (context as any).params;
  const resolvedParams: RouteParams = rawParams?.then
    ? await rawParams
    : rawParams;

  const { householdId, memberId } = resolvedParams || {};

  if (!householdId || !memberId) {
    console.error('Edit member: missing ids', resolvedParams);
    return NextResponse.json(
      { error: 'Missing household or member id in URL' },
      { status: 400 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    console.error('Edit member invalid JSON', err);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    member_type,
    email,
    phone,
  } = body ?? {};

  if (!first_name || !last_name) {
    return NextResponse.json(
      { error: 'First name and last name are required' },
      { status: 400 },
    );
  }

  const updateData: Record<string, any> = {
    first_name,
    last_name,
  };

  if (typeof date_of_birth !== 'undefined') {
    updateData.date_of_birth = date_of_birth;
  }
  if (typeof gender !== 'undefined') {
    updateData.gender = gender;
  }
  if (typeof member_type !== 'undefined') {
    updateData.member_type = member_type;
  }
  if (typeof email !== 'undefined') {
    updateData.email = email;
  }
  if (typeof phone !== 'undefined') {
    updateData.phone = phone;
  }

  const { data, error } = await supabase
    .from('members')
    .update(updateData)
    .eq('id', memberId)
    .eq('household_id', householdId)
    .select('id')
    .single();

  if (error || !data) {
    console.error('Edit member update error', error);
    return NextResponse.json(
      {
        error: 'Failed to update member',
        details: error?.message,
        code: error?.code,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, id: data.id });
}

export async function DELETE(
  _req: Request,
  context:
    | { params: RouteParams }
    | { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;

  // Next 16: params may be a Promise
  const rawParams: any = (context as any).params;
  const resolvedParams: RouteParams = rawParams?.then
    ? await rawParams
    : rawParams;

  const { householdId, memberId } = resolvedParams || {};

  if (!householdId || !memberId) {
    console.error('Delete member: missing ids', resolvedParams);
    return NextResponse.json(
      { error: 'Missing household or member id in URL' },
      { status: 400 },
    );
  }

  // 1) Load member to confirm it belongs to this household
  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, household_id, club_id')
    .eq('id', memberId)
    .maybeSingle();

  if (memberError) {
    console.error('Delete member – lookup error', memberError);
    return NextResponse.json(
      {
        error: 'Failed to look up member.',
        details: memberError.message,
      },
      { status: 500 },
    );
  }

  if (!member) {
    return NextResponse.json(
      { error: 'Member not found.' },
      { status: 404 },
    );
  }

  if (member.household_id !== householdId) {
    return NextResponse.json(
      {
        error:
          'This member does not belong to the specified household.',
      },
      { status: 400 },
    );
  }

  // 2) Check subscriptions for this member
  const { data: subs, error: subsError } = await supabase
    .from('membership_subscriptions')
    .select('id, status')
    .eq('member_id', memberId);

  if (subsError) {
    console.error(
      'Delete member – subscriptions lookup error',
      subsError,
    );
    return NextResponse.json(
      {
        error: 'Failed to check member subscriptions.',
        details: subsError.message,
      },
      { status: 500 },
    );
  }

  const hasActive = (subs ?? []).some(
    (s) => s.status === 'active',
  );

  if (hasActive) {
    return NextResponse.json(
      {
        error:
          'This member has an active membership and cannot be removed. Please contact the club.',
      },
      { status: 400 },
    );
  }

  // If there are only pending/cancelled subs, delete them first
  if (subs && subs.length > 0) {
    const { error: deleteSubsError } = await supabase
      .from('membership_subscriptions')
      .delete()
      .eq('member_id', memberId);

    if (deleteSubsError) {
      console.error(
        'Delete member – delete subs error',
        deleteSubsError,
      );
      return NextResponse.json(
        {
          error:
            'Failed to remove memberships attached to this member.',
          details: deleteSubsError.message,
        },
        { status: 500 },
      );
    }
  }

  // 3) Delete the member
  const { error: deleteMemberError } = await supabase
    .from('members')
    .delete()
    .eq('id', memberId)
    .eq('household_id', householdId)
    .single();

  if (deleteMemberError) {
    console.error('Delete member – delete error', deleteMemberError);
    return NextResponse.json(
      {
        error: 'Failed to remove member from household.',
        details: deleteMemberError.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
