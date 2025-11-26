// app/api/memberships/join/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type JoinPayload = {
  clubId: string;
  household: {
    id?: string;
    name?: string;
    email: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    town_city?: string;
    postcode?: string;
  };
  members: Array<{
    id?: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender?: string;
    member_type: 'player' | 'supporter' | 'coach';
    email?: string;
    phone?: string;
    plans: string[];
  }>;
};

export async function POST(req: Request) {
  const supabase = await createClient();

  let body: JoinPayload;
  try {
    body = (await req.json()) as JoinPayload;
  } catch (err) {
    console.error('Invalid JSON body', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { clubId, household, members } = body;

  if (!clubId || !household || !members?.length) {
    return NextResponse.json(
      { error: 'Missing clubId, household, or members' },
      { status: 400 },
    );
  }

  let householdId = household.id;

  // 1) Create household if needed
  if (!householdId) {
    const { data: h, error: hError } = await supabase
      .from('households')
      .insert({
        club_id: clubId,
        name: household.name ?? null,
        primary_email: household.email,
        phone: household.phone ?? null,
        address_line1: household.address_line1 ?? null,
        address_line2: household.address_line2 ?? null,
        town_city: household.town_city ?? null,
        postcode: household.postcode ?? null,
      })
      .select('id')
      .single();

    if (hError || !h) {
      console.error('Household insert error', hError);
      return NextResponse.json(
        {
          error: 'Failed to create household',
          details: hError?.message,
          code: hError?.code,
        },
        { status: 400 },
      );
    }

    householdId = h.id;
  }

  const createdSubscriptions: Array<{
    member_id: string;
    plan_id: string;
    subscription_id: string;
  }> = [];

  // 2) Members + subscriptions
  for (const m of members) {
    let memberId = m.id;

    if (!memberId) {
      const { data: memberRow, error: mError } = await supabase
        .from('members')
        .insert({
          club_id: clubId,
          household_id: householdId,
          first_name: m.first_name,
          last_name: m.last_name,
          date_of_birth: m.date_of_birth,
          gender: m.gender ?? null,
          member_type: m.member_type,
          email: m.email ?? null,
          phone: m.phone ?? null,
        })
        .select('id')
        .single();

      if (mError || !memberRow) {
        console.error('Member insert error', mError);
        return NextResponse.json(
          {
            error: 'Failed to create member',
            details: mError?.message,
            code: mError?.code,
          },
          { status: 400 },
        );
      }

      memberId = memberRow.id;
    }

    for (const planId of m.plans) {
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
          member_id: memberId,
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

      // Auto-assign default team (non-fatal)
      await supabase.rpc('assign_member_to_default_team', {
        p_club_id: clubId,
        p_member_id: memberId,
        p_plan_id: planId,
      });
    }
  }

  return NextResponse.json({
    householdId,
    subscriptions: createdSubscriptions,
  });
}
