// app/api/memberships/add-subscription/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type BillingPeriod = 'annual' | 'monthly';

type Payload = {
  householdId: string;
  memberId: string;
  planId: string;
  billingPeriod: BillingPeriod;
  membershipYear: number;
};

function getAgeOnDate(dobIso: string, onDate: Date) {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;

  let age = onDate.getFullYear() - dob.getFullYear();
  const m = onDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && onDate.getDate() < dob.getDate())) age--;
  return age;
}

function isJuniorForSeason(dobIso: string, membershipYear: number) {
  const sept1 = new Date(Date.UTC(membershipYear, 8, 1));
  const age = getAgeOnDate(dobIso, sept1);
  if (age === null) return null;
  return age < 18;
}

export async function POST(req: Request) {
  const supabase = await createClient();

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { householdId, memberId, planId, billingPeriod, membershipYear } =
    payload;

  if (!householdId || !memberId || !planId || !membershipYear) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  if (billingPeriod !== 'annual' && billingPeriod !== 'monthly') {
    return NextResponse.json(
      { error: 'Invalid billingPeriod' },
      { status: 400 },
    );
  }

  // Load household
  const { data: household } = await supabase
    .from('households')
    .select('id, club_id')
    .eq('id', householdId)
    .maybeSingle();

  if (!household) {
    return NextResponse.json({ error: 'Household not found' }, { status: 404 });
  }

  // Load member
  const { data: member } = await supabase
    .from('members')
    .select('id, club_id, household_id, date_of_birth')
    .eq('id', memberId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  if (member.club_id !== household.club_id) {
    return NextResponse.json(
      { error: 'Member does not belong to this club' },
      { status: 400 },
    );
  }

  // Load plan
  const { data: plan } = await supabase
    .from('membership_plans')
    .select(
      `
      id,
      club_id,
      name,
      is_junior_only,
      allow_annual,
      allow_monthly,
      annual_price_pennies,
      monthly_price_pennies,
      price_pennies
    `,
    )
    .eq('id', planId)
    .eq('club_id', household.club_id)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  // Enforce junior/adult rules if DOB available
  if (member.date_of_birth) {
    const juniorForSeason = isJuniorForSeason(member.date_of_birth, membershipYear);
    if (juniorForSeason === null) {
      return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
    }

    if (juniorForSeason && !plan.is_junior_only) {
      return NextResponse.json(
        {
          error: 'Plan mismatch',
          details: 'This member is a junior for the season. Choose a junior plan.',
        },
        { status: 400 },
      );
    }

    if (!juniorForSeason && plan.is_junior_only) {
      return NextResponse.json(
        {
          error: 'Plan mismatch',
          details: 'This member is an adult for the season. Choose an adult plan.',
        },
        { status: 400 },
      );
    }
  }

  // Validate billing period allowed and pick amount
  const allowAnnual = !!plan.allow_annual;
  const allowMonthly = !!plan.allow_monthly;

  if (billingPeriod === 'annual' && !allowAnnual) {
    return NextResponse.json(
      { error: 'This plan does not allow annual billing.' },
      { status: 400 },
    );
  }

  if (billingPeriod === 'monthly' && !allowMonthly) {
    return NextResponse.json(
      { error: 'This plan does not allow monthly billing.' },
      { status: 400 },
    );
  }

  let amountPennies: number | null = null;

  if (billingPeriod === 'annual') {
    amountPennies = plan.annual_price_pennies ?? plan.price_pennies ?? null;
  } else {
    amountPennies = plan.monthly_price_pennies ?? plan.price_pennies ?? null;
  }

  if (amountPennies == null || amountPennies < 0) {
    return NextResponse.json(
      { error: 'Plan pricing not configured for this billing period.' },
      { status: 400 },
    );
  }

  // Prevent duplicate pending/active subs for same member/year (basic guard)
  const { data: existing } = await supabase
    .from('membership_subscriptions')
    .select('id, status')
    .eq('household_id', householdId)
    .eq('member_id', memberId)
    .eq('membership_year', membershipYear)
    .in('status', ['pending', 'active'])
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'This member already has a pending or active membership for this year.' },
      { status: 400 },
    );
  }

  const { data: sub, error: subError } = await supabase
    .from('membership_subscriptions')
    .insert({
      membership_year: membershipYear,
      club_id: household.club_id,
      plan_id: planId,
      member_id: memberId,
      household_id: householdId,
      amount_pennies: amountPennies,
    })
    .select('id')
    .single();

  if (subError || !sub) {
    console.error('Failed to create subscription', subError);
    return NextResponse.json(
      { error: 'Failed to create membership subscription', details: subError?.message },
      { status: 500 },
    );
  }

  // Best-effort: assign default team if your RPC exists
  try {
    await supabase.rpc('assign_member_to_default_team', {
      p_club_id: household.club_id,
      p_member_id: memberId,
      p_plan_id: planId,
    });
  } catch {
    // non-fatal
  }

  return NextResponse.json({ subscriptionId: sub.id });
}
