// app/api/households/[householdId]/members/route.ts

import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

type RouteParams = {
  householdId: string;
};

export async function POST(
  req: Request,
  context: { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;

  // Next.js 16: params is a Promise
  const { householdId } = await context.params;

  if (!householdId || householdId === 'undefined') {
    console.error('Add member: missing householdId in params', { householdId });
    return NextResponse.json(
      { error: 'Missing household id in URL' },
      { status: 400 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    console.error('Add member invalid JSON', err);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const { clubId, member } = body ?? {};

  if (!clubId) {
    return NextResponse.json(
      { error: 'Missing clubId in request body' },
      { status: 400 },
    );
  }

  if (!member || typeof member !== 'object') {
    return NextResponse.json(
      { error: 'Missing member details in request body' },
      { status: 400 },
    );
  }

  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    email,
    phone,
    member_type,
  } = member;

  if (!first_name || !last_name) {
    return NextResponse.json(
      { error: 'First name and last name are required' },
      { status: 400 },
    );
  }

  if (!member_type) {
    return NextResponse.json(
      { error: 'Member type is required (player or supporter)' },
      { status: 400 },
    );
  }

  // 1) Create the member row
  const { data: createdMember, error: memberError } = await supabase
    .from('members')
    .insert([
      {
        household_id: householdId,
        club_id: clubId,
        first_name,
        last_name,
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        email: email || null,
        phone: phone || null,
        member_type,
      },
    ])
    .select('id, date_of_birth, member_type')
    .single();

  if (memberError || !createdMember) {
    console.error('Add member insert error', memberError);
    return NextResponse.json(
      {
        error: 'Failed to add member',
        details: memberError?.message,
        code: memberError?.code,
      },
      { status: 400 },
    );
  }

  const memberId: string = createdMember.id;

  // 2) Legacy auto-membership: try to attach a single pending sub
  let createdSubscriptionId: string | null = null;

  try {
    if (member_type === 'player' || member_type === 'supporter') {
      const { data: plans, error: plansError } = await supabase
        .from('membership_plans')
        .select(
          `
            id,
            name,
            slug,
            price_pennies,
            is_visible_online,
            is_player_plan,
            is_junior_only,
            is_household_plan
          `,
        )
        .eq('club_id', clubId)
        .eq('is_visible_online', true);

      if (!plansError && plans && plans.length > 0) {
        const now = new Date();

        const isJunior = (() => {
          if (!createdMember.date_of_birth) return false;
          const dob = new Date(createdMember.date_of_birth);
          if (Number.isNaN(dob.getTime())) return false;
          const ageMs = now.getTime() - dob.getTime();
          const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
          return ageYears < 18;
        })();

        let chosenPlan: any | null = null;

        if (member_type === 'player') {
          if (isJunior) {
            chosenPlan = plans.find(
              (p: any) =>
                p.is_player_plan &&
                p.is_junior_only &&
                !p.is_household_plan,
            );
          } else {
            chosenPlan = plans.find(
              (p: any) =>
                p.is_player_plan &&
                !p.is_junior_only &&
                !p.is_household_plan,
            );
          }
        } else if (member_type === 'supporter') {
          chosenPlan = plans.find(
            (p: any) => !p.is_player_plan && !p.is_household_plan,
          );
        }

        if (chosenPlan) {
          const { data: sub, error: subError } = await supabase
            .from('membership_subscriptions')
            .insert({
              club_id: clubId,
              plan_id: chosenPlan.id,
              member_id: memberId,
              household_id: householdId,
              amount_pennies: chosenPlan.price_pennies,
              status: 'pending',
            })
            .select('id')
            .single();

          if (!subError && sub) {
            createdSubscriptionId = sub.id;
          }
        }
      }
    }
  } catch (autoErr) {
    console.error('Auto-membership: unexpected error', autoErr);
  }

  // 3) ALWAYS run pricing-engine-based recalc after adding a member
  try {
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      process.env.SITE_URL ??
      'http://localhost:3000';

    await fetch(
      `${origin}/api/households/${householdId}/memberships/recalculate?year=2026`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      },
    );
  } catch (err) {
    console.error('Recalculate after add-member failed', err);
    // non-fatal – member is created, we just haven’t updated pending subs
  }

  // 4) Return the new member + legacy subscription id if any
  return NextResponse.json(
    {
      success: true,
      memberId,
      subscriptionId: createdSubscriptionId,
    },
    { status: 200 },
  );
}
