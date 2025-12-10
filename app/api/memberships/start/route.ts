// app/api/memberships/start/route.ts

import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

type StartPayload = {
  clubId: string;
  planId: string;
  userEmail: string;
  billingPeriod: 'annual' | 'monthly';
  membershipYear: number;
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
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const {
    clubId,
    planId,
    userEmail,
    billingPeriod,
    membershipYear,
    member,
  } = body;

  if (
    !clubId ||
    !planId ||
    !userEmail ||
    !membershipYear ||
    !billingPeriod ||
    !member?.first_name ||
    !member?.last_name ||
    !member?.date_of_birth
  ) {
    return NextResponse.json(
      {
        error:
          'Missing clubId, planId, billingPeriod, membershipYear, userEmail or member details',
      },
      { status: 400 },
    );
  }

  // 1) Ensure plan exists and get pricing + type
  const { data: plan, error: planError } = await supabase
    .from('membership_plans')
    .select(
      `
      id,
      price_pennies,
      is_player_plan,
      allow_annual,
      allow_monthly,
      annual_price_pennies,
      monthly_price_pennies
    `,
    )
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

  // 2) Decide amount_pennies based on billingPeriod
  let amountPennies: number | null = null;

  if (billingPeriod === 'annual') {
    if (!plan.allow_annual) {
      return NextResponse.json(
        { error: 'Annual billing is not enabled for this plan' },
        { status: 400 },
      );
    }

    // For annual billing, use the dedicated annual price if set,
    // otherwise fall back to legacy price_pennies.
    amountPennies = plan.annual_price_pennies ?? plan.price_pennies ?? null;
  } else if (billingPeriod === 'monthly') {
    if (!plan.allow_monthly) {
      return NextResponse.json(
        { error: 'Monthly billing is not enabled for this plan' },
        { status: 400 },
      );
    }

    // For monthly billing, use monthly_price_pennies if set,
    // otherwise fall back to legacy price_pennies.
    amountPennies = plan.monthly_price_pennies ?? plan.price_pennies ?? null;
  }

  if (!amountPennies || amountPennies <= 0) {
    console.error('Invalid amount_pennies resolved from plan', {
      planId,
      billingPeriod,
      amountPennies,
    });
    return NextResponse.json(
      { error: 'Invalid membership price configuration' },
      { status: 400 },
    );
  }

  // 3) Find or create household for this club + email
  let householdId: string | null = null;

  const { data: existingHousehold, error: existingHouseholdError } =
    await supabase
      .from('households')
      .select('id')
      .eq('club_id', clubId)
      .eq('primary_email', userEmail)
      .maybeSingle();

  if (existingHouseholdError) {
    console.error('Household lookup error', existingHouseholdError);
    return NextResponse.json(
      {
        error: 'Failed to look up household',
        details: existingHouseholdError.message,
      },
      { status: 500 },
    );
  }

  if (existingHousehold) {
    householdId = existingHousehold.id;
  } else {
    const { data: newHousehold, error: householdInsertError } =
      await supabase
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

  // 4) Create member linked to this household
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

  // 5) Create pending subscription (local record only – payment is via household checkout)
  const { data: sub, error: subError } = await supabase
    .from('membership_subscriptions')
    .insert({
      club_id: clubId,
      plan_id: planId,
      member_id: newMember.id,
      household_id: householdId,
      membership_year: membershipYear,
      amount_pennies: amountPennies,
      status: 'pending',
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

  // 6) Non-fatal: assign member to default team if configured
  try {
    await supabase.rpc('assign_member_to_default_team', {
      p_club_id: clubId,
      p_member_id: newMember.id,
      p_plan_id: planId,
    });
  } catch (rpcError) {
    console.error('assign_member_to_default_team error', rpcError);
  }

  // 7) Return identifiers for the client – NO Stripe checkout here
  return NextResponse.json({
    householdId,
    memberId: newMember.id,
    subscriptionId: sub.id,
  });
}
