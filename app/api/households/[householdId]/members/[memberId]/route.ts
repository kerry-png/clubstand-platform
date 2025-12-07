// app/api/households/[householdId]/members/[memberId]/route.ts
import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

type RouteParams = {
  householdId: string;
  memberId: string;
};

export async function PATCH(
  req: Request,
  context: { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;

  // Next.js 16: params is a Promise
  const { householdId, memberId } = await context.params;

  if (!householdId || !memberId) {
    console.error('Edit member: missing ids', { householdId, memberId });
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
