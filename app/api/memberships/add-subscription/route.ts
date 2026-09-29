// app/api/memberships/add-subscription/route.ts

import { NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/auth/householdAccess';
import { DEFAULT_MEMBERSHIP_SETTINGS, currentMembershipYear } from '@/lib/membership/rules';
import { evaluatePlanEligibility } from '@/lib/membership/eligibility';
import { calculateJoiningPrice } from '@/lib/membership/joiningPrice';

type BillingPeriod = 'annual' | 'monthly';

type Payload = {
  householdId: string;
  memberId: string;
  planId: string;
  billingPeriod: BillingPeriod;
  membershipYear?: number;
};

export async function POST(req: Request) {
  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { householdId, memberId, planId, billingPeriod } = payload;

  if (!householdId || !memberId || !planId) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    );
  }

  const access = await requireHouseholdAccess(householdId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const supabase = access.supabase;

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
    .select('id, club_id, household_id, date_of_birth, member_type')
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
      is_player_plan,
      minimum_age,
      maximum_age,
      requires_approval,
      mid_season_treatment,
      trial_days,
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

  // Use the same club/plan eligibility rules as invitation registration.
  const { data: settingsRow } = await supabase.from('club_membership_settings').select('*').eq('club_id', household.club_id).maybeSingle();
  const settings = { ...DEFAULT_MEMBERSHIP_SETTINGS, ...(settingsRow ?? {}) };
  // Member-facing joins always use the club's current membership year.
  // Future-year/admin assignments should use a separate privileged workflow.
  const membershipYear = currentMembershipYear(new Date(), settings);
  const eligibility = evaluatePlanEligibility({
    dob: member.date_of_birth,
    role: member.member_type === 'supporter' ? 'supporter' : 'player',
    membershipYear,
    settings,
    plan,
  });
  if (!eligibility.eligible) return NextResponse.json({ error: 'Plan mismatch', details: eligibility.reason }, { status: 400 });

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

  const quote = calculateJoiningPrice({
    fullAmountPennies: amountPennies,
    billing: billingPeriod,
    now: new Date(),
    membershipYear,
    settings,
    planTreatment: plan.mid_season_treatment,
    planTrialDays: plan.trial_days,
  });
  amountPennies = quote.amountPennies;

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
      joining_treatment: quote.treatment,
      trial_ends_at: quote.treatment === 'trial' && quote.trialDays > 0 ? new Date(Date.now() + quote.trialDays * 86400000).toISOString() : null,
      requires_manual_review: quote.requiresManualReview || plan.requires_approval === true,
      review_status: quote.requiresManualReview || plan.requires_approval === true ? 'pending' : 'not_required',
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
