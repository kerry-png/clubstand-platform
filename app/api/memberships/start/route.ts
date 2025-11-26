// app/api/memberships/start/route.ts
import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

type StartPayload = {
  clubId: string;
  planId: string;
  userEmail: string;
  member: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string | null;
    phone: string | null;
  };
};

export async function POST(req: Request) {
  const supabase = supabaseServerClient;

  let body: StartPayload;
  try {
    body = (await req.json()) as StartPayload;
  } catch (err) {
    console.error('Invalid JSON body', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { clubId, planId, userEmail, member } = body;

  if (!clubId || !planId || !userEmail || !member?.first_name || !member?.last_name || !member?.date_of_birth) {
    return NextResponse.json(
      { error: 'Missing clubId, planId, userEmail or member details' },
      { status: 400 },
    );
  }

  // 1) Ensure plan exists and get price + type
  const { data: plan, error: planError } = await supabase
    .from('membership_plans')
    .select('id, price_pennies, is_player_plan')
    .eq('id', planId)
    .eq('club_id', clubId)
    .maybeSingle();

  if (planError || !plan) {
    console.error('Plan lookup error', planError);
    return NextResponse.json(
      { error: 'Membership plan not found for this club' },
      { status: 400 },
    );
  }

  // 2) Try to find existing household for this club + email
  const { data: existingHousehold, error: householdLookupError } = await supabase
    .from('households')
    .select('id')
    .eq('club_id', clubId)
    .eq('primary_email', userEmail)
    .maybeSingle();

  if (householdLookupError) {
    console.error('Household lookup error', householdLookupError);
  }

  let householdId = existingHousehold?.id as string | undefined;

  // 3) Create household if needed
  if (!householdId) {
    const { data: newHousehold, error: householdInsertError } = await supabase
      .from('households')
      .insert({
        club_id: clubId,
        primary_email: userEmail,
        name: `${member.first_name} ${member.last_name}`.trim(),
        phone: member.phone,
      })
      .select('id')
      .single();

    if (householdInsertError || !newHousehold) {
      console.error('Household insert error', householdInsertError);
      return NextResponse.json(
        {
          error: 'Failed to create household',
          details: householdInsertError?.message,
          code: householdInsertError?.code,
        },
        { status: 400 },
      );
    }

    householdId = newHousehold.id;
  }

  // 4) Create member
  const { data: newMember, error: memberError } = await supabase
    .from('members')
    .insert({
      club_id: clubId,
      household_id: householdId,
      first_name: member.first_name,
      last_name: member.last_name,
      date_of_birth: member.date_of_birth,
      gender: member.gender,
      member_type: plan.is_player_plan ? 'player' : 'supporter',
      email: userEmail,
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

  // 5) Create pending subscription
  const { data: sub, error: subError } = await supabase
    .from('membership_subscriptions')
    .insert({
      club_id: clubId,
      plan_id: planId,
      member_id: newMember.id,
      household_id: householdId,
      amount_pennies: plan.price_pennies,
    })
    .select('id')
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

  // Non-fatal: assign member to default team if configured
  try {
    await supabase.rpc('assign_member_to_default_team', {
      p_club_id: clubId,
      p_member_id: newMember.id,
      p_plan_id: planId,
    });
  } catch (rpcError) {
    console.error('assign_member_to_default_team error', rpcError);
  }

  return NextResponse.json({
    householdId,
    memberId: newMember.id,
    subscriptionId: sub.id,
  });
}
