// app/api/memberships/start/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type BillingPeriod = 'annual' | 'monthly';

type StartPayload = {
  clubId: string;
  planId: string;
  userEmail: string;
  billingPeriod: BillingPeriod;
  membershipYear: number;
  member: {
    first_name: string;
    last_name: string;
    date_of_birth: string; // YYYY-MM-DD
    gender: string | null;
    phone: string | null;
  };
};

function getAgeOnDate(dobIso: string, onDate: Date) {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;

  let age = onDate.getFullYear() - dob.getFullYear();
  const m = onDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && onDate.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

// Cricket rule: junior status based on age on 1st September for the season year
function isJuniorForSeason(dobIso: string, membershipYear: number) {
  // 1st Sept of membershipYear
  const sept1 = new Date(Date.UTC(membershipYear, 8, 1)); // month 8 = September
  const age = getAgeOnDate(dobIso, sept1);
  if (age === null) return null;
  return age < 18;
}

function pickBillingPeriod(
  requested: BillingPeriod | undefined,
  allowAnnual: boolean,
  allowMonthly: boolean,
  defaultPeriod: BillingPeriod,
): BillingPeriod {
  if (requested === 'monthly' && allowMonthly) return 'monthly';
  if (requested === 'annual' && allowAnnual) return 'annual';

  // If requested period isn't allowed, fall back sensibly
  if (defaultPeriod === 'monthly' && allowMonthly) return 'monthly';
  if (defaultPeriod === 'annual' && allowAnnual) return 'annual';

  // Last resort: pick whatever is allowed
  if (allowAnnual) return 'annual';
  if (allowMonthly) return 'monthly';

  // Should never happen if plans are configured sensibly
  return 'annual';
}

export async function POST(req: Request) {
  const supabase = await createClient();

  let payload: StartPayload;

  try {
    payload = await req.json();
  } catch (err) {
    console.error('Invalid JSON in /api/memberships/start', err);
    return NextResponse.json(
      { error: 'Invalid request payload' },
      { status: 400 },
    );
  }

  const { clubId, planId, userEmail, membershipYear, member } = payload;

  if (!clubId || !planId || !userEmail || !membershipYear) {
    return NextResponse.json(
      {
        error: 'Missing required fields',
        details: 'clubId, planId, userEmail and membershipYear are required.',
      },
      { status: 400 },
    );
  }

  if (!member?.first_name || !member?.last_name || !member?.date_of_birth) {
    return NextResponse.json(
      { error: 'Missing member details' },
      { status: 400 },
    );
  }

  const juniorForSeason = isJuniorForSeason(member.date_of_birth, membershipYear);
  if (juniorForSeason === null) {
    return NextResponse.json(
      { error: 'Invalid date of birth' },
      { status: 400 },
    );
  }

  // 1) Load plan and validate constraints
  const { data: plan, error: planError } = await supabase
    .from('membership_plans')
    .select(
      `
        id,
        club_id,
        name,
        is_junior_only,
        billing_period,
        allow_annual,
        allow_monthly,
        annual_price_pennies,
        monthly_price_pennies,
        price_pennies
      `,
    )
    .eq('id', planId)
    .eq('club_id', clubId)
    .maybeSingle();

  if (planError || !plan) {
    console.error('Plan lookup error', planError);
    return NextResponse.json(
      { error: 'Could not find membership plan for this club.' },
      { status: 400 },
    );
  }

  // Enforce junior/adult mismatch
  if (juniorForSeason && !plan.is_junior_only) {
    return NextResponse.json(
      {
        error: 'Plan mismatch',
        details:
          'This date of birth indicates a junior for this season. Please choose a junior membership plan.',
      },
      { status: 400 },
    );
  }

  if (!juniorForSeason && plan.is_junior_only) {
    return NextResponse.json(
      {
        error: 'Plan mismatch',
        details:
          'This date of birth indicates an adult for this season. Please choose an adult membership plan.',
      },
      { status: 400 },
    );
  }

  const allowAnnual = !!plan.allow_annual;
  const allowMonthly = !!plan.allow_monthly;
  const defaultPeriod = (plan.billing_period as BillingPeriod) || 'annual';

  const chosenBillingPeriod = pickBillingPeriod(
    payload.billingPeriod,
    allowAnnual,
    allowMonthly,
    defaultPeriod,
  );

  // Determine amount based on billing period
  let amountPennies: number | null = null;

  if (chosenBillingPeriod === 'annual') {
    amountPennies =
      plan.annual_price_pennies ??
      (plan.price_pennies ?? null);
  } else {
    amountPennies =
      plan.monthly_price_pennies ??
      (plan.price_pennies ?? null);
  }

  if (amountPennies == null || Number.isNaN(amountPennies) || amountPennies < 0) {
    return NextResponse.json(
      {
        error: 'Plan pricing not configured',
        details:
          'This plan does not have a valid price for the selected billing period.',
      },
      { status: 400 },
    );
  }

  // 2) Find or create household
  let householdId: string;

  const { data: existingHousehold } = await supabase
    .from('households')
    .select('id')
    .eq('club_id', clubId)
    .eq('primary_email', userEmail)
    .maybeSingle();

  if (existingHousehold?.id) {
    householdId = existingHousehold.id;
  } else {
    const { data: newHousehold, error: householdInsertError } = await supabase
      .from('households')
      .insert({
        club_id: clubId,
        primary_email: userEmail,
        name: `${member.first_name} ${member.last_name}`.trim(),
        phone: member.phone ?? null,
      })
      .select('id')
      .single();

    if (householdInsertError || !newHousehold) {
      console.error('Household insert error', householdInsertError);
      return NextResponse.json(
        { error: 'Failed to create household', details: householdInsertError?.message },
        { status: 500 },
      );
    }

    householdId = newHousehold.id;
  }

  // 3) Create member linked to household
  const { data: newMember, error: memberError } = await supabase
    .from('members')
    .insert({
      club_id: clubId,
      household_id: householdId,
      first_name: member.first_name.trim(),
      last_name: member.last_name.trim(),
      date_of_birth: member.date_of_birth,
      gender: member.gender || null,
      email: userEmail,
      phone: member.phone ?? null,
    })
    .select('id')
    .single();

  if (memberError || !newMember) {
    console.error('Member insert error', memberError);
    return NextResponse.json(
      { error: 'Failed to create member', details: memberError?.message },
      { status: 500 },
    );
  }

  // 4) Create pending subscription
  const { data: sub, error: subError } = await supabase
    .from('membership_subscriptions')
    .insert({
      membership_year: membershipYear,
      club_id: clubId,
      plan_id: planId,
      member_id: newMember.id,
      household_id: householdId,
      amount_pennies: amountPennies,
      // status defaults to 'pending'
      // start_date defaults to CURRENT_DATE
    })
    .select('id')
    .single();

  if (subError || !sub) {
    console.error('Subscription insert error', subError);
    return NextResponse.json(
      { error: 'Failed to create membership subscription', details: subError?.message },
      { status: 500 },
    );
  }

  // 5) Best-effort: assign member to plan default team
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
    billingPeriod: chosenBillingPeriod,
  });
}
