// app/api/households/[householdId]/members/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type AddMemberPayload = {
  member: {
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    gender: string | null;
    email: string | null;
    phone: string | null;
    member_type: 'player' | 'supporter' | 'coach';
  };
  planId: string | null;
};

export async function POST(req: Request) {
  const supabase = await createClient();

  // 🔍 Derive householdId directly from the URL path:
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  // Expecting: ['api', 'households', '<householdId>', 'members']
  const householdsIndex = segments.indexOf('households');
  const householdId =
    householdsIndex !== -1 ? segments[householdsIndex + 1] : null;

  if (!householdId) {
    console.error('Could not derive householdId from URL', url.pathname);
    return NextResponse.json(
      { error: 'Missing householdId in URL' },
      { status: 400 },
    );
  }

  let body: AddMemberPayload;

  try {
    body = (await req.json()) as AddMemberPayload;
  } catch (err) {
    console.error('Invalid JSON body', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { member, planId } = body;

  if (!member?.first_name || !member?.last_name) {
    return NextResponse.json(
      { error: 'Missing member name details' },
      { status: 400 },
    );
  }

  // 1) Ensure the household exists and get the real club_id
  const { data: household, error: householdError } = await supabase
    .from('households')
    .select('id, club_id')
    .eq('id', householdId)
    .maybeSingle();

  if (householdError || !household) {
    console.error('Household not found or error', householdError);
    return NextResponse.json(
      { error: 'Household not found' },
      { status: 400 },
    );
  }

  const clubId = household.club_id;

  // 2) Create the member
  const { data: newMember, error: memberError } = await supabase
    .from('members')
    .insert({
      club_id: clubId,
      household_id: householdId,
      first_name: member.first_name,
      last_name: member.last_name,
      date_of_birth: member.date_of_birth,
      gender: member.gender,
      member_type: member.member_type,
      email: member.email,
      phone: member.phone,
    })
    .select('id')
    .single();

  if (memberError || !newMember) {
    console.error('Member insert error', memberError);
    return NextResponse.json(
      {
        error: 'Failed to create member',
        details: memberError?.message,
        code: memberError?.code,
      },
      { status: 400 },
    );
  }

  const createdSubscriptions: Array<{
    member_id: string;
    plan_id: string;
    subscription_id: string;
  }> = [];

  // 3) If a plan was chosen, create a pending subscription
  if (planId) {
    const { data: planRow, error: planError } = await supabase
      .from('membership_plans')
      .select('price_pennies')
      .eq('id', planId)
      .single();

    if (planError || !planRow) {
      console.error('Plan lookup error', planError);
      return NextResponse.json(
        {
          error: 'Failed to create subscription',
          details: planError?.message,
          code: planError?.code,
        },
        { status: 400 },
      );
    }

    const { data: sub, error: subError } = await supabase
      .from('membership_subscriptions')
      .insert({
        club_id: clubId,
        plan_id: planId,
        member_id: newMember.id,
        household_id: householdId,
        amount_pennies: planRow.price_pennies,
      })
      .select('id, plan_id, member_id')
      .single();

    if (subError || !sub) {
      console.error('Subscription insert error', subError);
      return NextResponse.json(
        {
          error: 'Failed to create subscription',
          details: subError?.message,
          code: subError?.code,
        },
        { status: 400 },
      );
    }

    createdSubscriptions.push({
      member_id: sub.member_id,
      plan_id: sub.plan_id,
      subscription_id: sub.id,
    });

    // Non-fatal: attempt to assign to default team
    try {
      await supabase.rpc('assign_member_to_default_team', {
        p_club_id: clubId,
        p_member_id: newMember.id,
        p_plan_id: planId,
      });
    } catch (rpcError) {
      console.error('assign_member_to_default_team error', rpcError);
      // ignore – not critical
    }
  }

  return NextResponse.json({
    householdId,
    subscriptions: createdSubscriptions,
  });
}
