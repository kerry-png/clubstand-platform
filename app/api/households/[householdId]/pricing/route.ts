// app/api/households/[householdId]/pricing/route.ts

import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';
import {
  type HouseholdMemberInput,
  type ClubPricingConfig,
} from '@/lib/pricing/rainhill2026';
import {
  buildRainhill2026PricingWithSubs,
  type SubscriptionRow,
} from '@/lib/pricing/rainhill2026WithSubs';

type RouteParams = {
  householdId: string;
};

async function getHouseholdClubId(householdId: string) {
  const { data, error } = await supabaseServerClient
    .from('households')
    .select('club_id')
    .eq('id', householdId)
    .maybeSingle();

  if (error) {
    console.error('Pricing: failed to load household club_id', error);
    return null;
  }

  return (data?.club_id as string | null) ?? null;
}

async function getClubPricingConfig(
  clubId: string,
  membershipYear: number,
): Promise<ClubPricingConfig | undefined> {
  const { data, error } = await supabaseServerClient
    .from('club_pricing_config')
    .select('*')
    .eq('club_id', clubId)
    .eq('membership_year', membershipYear)
    .maybeSingle();

  if (error || !data) {
    // No config row – the engine will fall back to DEFAULT_RAINHILL_2026_CONFIG
    if (error) {
      console.error('Pricing: failed to load club_pricing_config', error);
    }
    return undefined;
  }

  const cfg: ClubPricingConfig = {
    pricing_model: (data as any).pricing_model ?? 'bundled',
    cutoff_month: data.cutoff_month,
    cutoff_day: data.cutoff_day,
    junior_max_age: data.junior_max_age,
    adult_min_age: data.adult_min_age,
    adult_bundle_min_age: data.adult_bundle_min_age,
    enable_adult_bundle: data.enable_adult_bundle,
    require_junior_for_adult_bundle:
      data.require_junior_for_adult_bundle,
    min_adults_for_bundle: data.min_adults_for_bundle,
    male_full_price_pennies: data.male_full_price_pennies,
    male_intermediate_price_pennies:
      data.male_intermediate_price_pennies,
    female_full_price_pennies: data.female_full_price_pennies,
    female_intermediate_price_pennies:
      data.female_intermediate_price_pennies,
    junior_single_price_pennies: data.junior_single_price_pennies,
    junior_multi_price_pennies: data.junior_multi_price_pennies,
    social_adult_price_pennies: data.social_adult_price_pennies,
    adult_bundle_price_pennies: data.adult_bundle_price_pennies,
  };

  return cfg;
}

export async function GET(
  req: Request,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;

  // Next 16: params may be a plain object or a Promise
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

  // 1) Household → club_id (optional, for config; we don't hard-fail if null)
  const clubId = await getHouseholdClubId(householdId);
  const config = clubId
    ? await getClubPricingConfig(clubId, seasonYear)
    : undefined;

  // 2) Load all members for this household
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

  // 3) Load all membership_subscriptions for this household
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

  // Normalise to SubscriptionRow
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

  // 4) Run combined pricing + subs engine (now with optional config)
  const pricingWithSubs = buildRainhill2026PricingWithSubs({
    householdId,
    members: memberInputs,
    existingSubscriptions: subscriptionRows,
    seasonYear,
    config,
  });

  return NextResponse.json(
    {
      success: true,
      householdId,
      seasonYear: pricingWithSubs.engine.seasonYear,
      enginePricing: pricingWithSubs.engine,
      pricing: pricingWithSubs,
      clubId,
      usedConfig: config ?? null,
    },
    { status: 200 },
  );
}
