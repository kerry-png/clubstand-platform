// app/api/households/[householdId]/pricing/route.ts

import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { type HouseholdMemberInput } from '@/lib/pricing/rainhill2026';
import {
  buildRainhill2026PricingWithSubs,
  type SubscriptionRow,
} from '@/lib/pricing/rainhill2026WithSubs';

type RouteParams = {
  householdId: string;
};

export async function GET(
  req: Request,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;

  // Next 16: params may be a Promise
  const rawParams: any = (context as any).params;
  const resolvedParams: RouteParams = rawParams?.then
    ? await rawParams
    : rawParams;

  const householdId = resolvedParams?.householdId;

  if (!householdId || householdId === 'undefined') {
    return NextResponse.json(
      { error: 'Missing household id in URL' },
      { status: 400 },
    );
  }

  // Optional: allow overriding the season year via query (?seasonYear=2027)
  const url = new URL(req.url);
  const seasonYearParam = url.searchParams.get('seasonYear');
  const seasonYear = seasonYearParam
    ? Number(seasonYearParam) || 2026
    : 2026;

  // 1) Load all members for this household
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('id, date_of_birth, gender, member_type')
    .eq('household_id', householdId);

  if (membersError) {
    console.error('Pricing: members load error', membersError);
    return NextResponse.json(
      {
        error: 'Failed to load household members',
        details: membersError.message,
        code: membersError.code,
      },
      { status: 500 },
    );
  }

  const memberInputs: HouseholdMemberInput[] = (members ?? []).map(
    (m: any) => ({
      id: m.id,
      date_of_birth: m.date_of_birth,
      gender: (m.gender as any) ?? null,
      member_type: (m.member_type as any) ?? 'member',
    }),
  );

  // 2) Load all membership_subscriptions for this household
  const { data: subs, error: subsError } = await supabase
    .from('membership_subscriptions')
    .select(
      `
        id,
        club_id,
        plan_id,
        member_id,
        household_id,
        status,
        membership_year,
        start_date,
        end_date,
        auto_renews,
        amount_pennies,
        discount_pennies,
        stripe_subscription_id,
        notes_internal
      `,
    )
    .eq('household_id', householdId);

  if (subsError) {
    console.error('Pricing: subscriptions load error', subsError);
    return NextResponse.json(
      {
        error: 'Failed to load household subscriptions',
        details: subsError.message,
        code: subsError.code,
      },
      { status: 500 },
    );
  }

  // Normalise to SubscriptionRow – IMPORTANT:
  // membership_year: 0 means "legacy / unknown season" and will be ignored
  // by the 2026 engine when it filters by seasonYear.
  const subscriptionRows: SubscriptionRow[] = (subs ?? []).map(
    (s: any) => ({
      id: s.id,
      club_id: s.club_id ?? null,
      plan_id: s.plan_id,
      member_id: s.member_id ?? null,
      household_id: s.household_id,
      status: s.status,
      membership_year:
        typeof s.membership_year === 'number'
          ? s.membership_year
          : 0,
      start_date: s.start_date,
      end_date: s.end_date,
      auto_renews: s.auto_renews ?? null,
      amount_pennies: s.amount_pennies ?? 0,
      discount_pennies: s.discount_pennies ?? 0,
      stripe_subscription_id: s.stripe_subscription_id ?? null,
      notes_internal: s.notes_internal ?? null,
    }),
  );

  // 3) Run combined pricing + subs engine
  const pricingWithSubs = buildRainhill2026PricingWithSubs({
    householdId,
    members: memberInputs,
    existingSubscriptions: subscriptionRows,
    seasonYear,
  });

  // Shape response for HouseholdPricingPreview (and any future admin views)
  return NextResponse.json(
    {
      success: true,
      householdId,
      seasonYear: pricingWithSubs.engine.seasonYear,
      enginePricing: pricingWithSubs.engine,
      pricing: pricingWithSubs,
    },
    { status: 200 },
  );
}
