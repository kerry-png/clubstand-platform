// app/api/households/[householdId]/renew/route.ts

import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';
import {
  type HouseholdMemberInput,
} from '@/lib/pricing/rainhill2026';
import {
  buildRainhill2026PricingWithSubs,
  type SubscriptionRow,
  type EngineChargeItem,
  type RainhillChargeKind,
} from '@/lib/pricing/rainhill2026WithSubs';
import { stripe } from '@/lib/stripe';

type RouteParams = {
  householdId: string;
};

type RawSubscription = {
  id: string;
  club_id: string | null;
  plan_id: string;
  member_id: string | null;
  household_id: string;
  status: string;
  membership_year: number | null;
  start_date: string | null;
  end_date: string | null;
  auto_renews: boolean | null;
  amount_pennies: number | null;
  discount_pennies: number | null;
  stripe_subscription_id: string | null;
  notes_internal: string | null;
};

const DEFAULT_SEASON_YEAR = 2026;

/**
 * These are your real membership_plans IDs.
 * (From: SELECT id, name, slug FROM membership_plans;)
 */
const RAINHILL_PLAN_IDS: Record<RainhillChargeKind, string> = {
  'adult-bundle': '084fdd3a-ef9c-48c7-9f3a-5a041a779980',  // Family Membership Cap
  'adult-topup': '66672765-cd2b-489c-bcc1-2e1b7d719b16',   // Adult Player
  'junior-bundle': '90ada9bf-463e-479f-8270-8725537f502d', // Junior Player
  'social-adult': '7338eb61-00de-47d2-9f6f-8649bc8f310f',  // Social / Parent Supporter
};

/**
 * These must be your real Stripe Price IDs.
 * Update the right-hand side strings to match Stripe.
 */
const RAINHILL_STRIPE_PRICE_IDS: Record<RainhillChargeKind, string> = {
  'adult-bundle': 'price_1SX0YDLugoVEyVYDBRZPgxmG',   // Family Membership Cap
  'adult-topup': 'price_1SX0WVLugoVEyVYD4pG9uMUZ',     // Adult Player
  'junior-bundle': 'price_1SX0VmLugoVEyVYD19NwLuBT',  // Junior Player
  'social-adult': 'price_1SX0XwLugoVEyVYDFAZmqXwq',   // Social / Parent
};

function getSeasonStartDate(clubId: string, seasonYear: number): string {
  // TODO: in future, look up per-club season start in a config table.
  // For now, treat membership year as starting on 1st January of that year.
  return `${seasonYear}-01-01`;
}

function normaliseSubs(rawSubs: RawSubscription[]): SubscriptionRow[] {
  return rawSubs.map((s) => ({
    id: s.id,
    club_id: s.club_id,
    plan_id: s.plan_id,
    member_id: s.member_id,
    household_id: s.household_id,
    status: s.status as SubscriptionRow['status'],
    membership_year:
          typeof s.membership_year === 'number' ? s.membership_year : 0,    start_date: s.start_date,
    end_date: s.end_date,
    auto_renews: s.auto_renews,
    amount_pennies: s.amount_pennies ?? 0,
    discount_pennies: s.discount_pennies ?? 0,
    stripe_subscription_id: s.stripe_subscription_id,
    notes_internal: s.notes_internal,
  }));
}

async function getHouseholdClubId(householdId: string) {
  const { data, error } = await supabaseServerClient
    .from('households')
    .select('club_id')
    .eq('id', householdId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load household club_id: ${error.message}`,
    );
  }

  return data?.club_id as string | null;
}

function getPlanIdForCharge(charge: EngineChargeItem): string {
  const planId = RAINHILL_PLAN_IDS[charge.kind];
  if (!planId) {
    throw new Error(
      `No plan_id mapping defined for charge kind "${charge.kind}"`,
    );
  }
  return planId;
}

function getStripePriceForCharge(charge: EngineChargeItem): string {
  const priceId = RAINHILL_STRIPE_PRICE_IDS[charge.kind];
  if (!priceId) {
    throw new Error(
      `No Stripe price mapping defined for charge kind "${charge.kind}"`,
    );
  }
  return priceId;
}

export async function POST(
  req: Request,
  context: { params: Promise<RouteParams> },
) {
  try {
    const supabase = supabaseServerClient;

    // Next.js 16: params is a Promise
    const { householdId } = await context.params;

    const url = new URL(req.url);
    const yearParam = url.searchParams.get('year');
    const seasonYear =
      (yearParam ? Number(yearParam) : DEFAULT_SEASON_YEAR) ||
      DEFAULT_SEASON_YEAR;

    if (!householdId || householdId === 'undefined') {
      return NextResponse.json(
        { error: 'Missing household id in URL' },
        { status: 400 },
      );
    }

    // 1) Household → club_id
    const clubId = await getHouseholdClubId(householdId);
    if (!clubId) {
      return NextResponse.json(
        {
          error:
            'Household has no club_id – cannot create subscriptions',
        },
        { status: 400 },
      );
    }

    // 2) Members
    const {
      data: members,
      error: membersError,
    } = await supabase
      .from('members')
      .select('id, date_of_birth, gender, member_type')
      .eq('household_id', householdId);

    if (membersError) {
      console.error('Renew: members load error', membersError);
      return NextResponse.json(
        {
          error: 'Failed to load household members',
          details: membersError.message,
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

    // 3) Existing subs for this household
    const {
      data: rawSubs,
      error: subsError,
    } = await supabase
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
      console.error('Renew: subscriptions load error', subsError);
      return NextResponse.json(
        {
          error: 'Failed to load household subscriptions',
          details: subsError.message,
        },
        { status: 500 },
      );
    }

    const normalisedSubs = normaliseSubs(rawSubs ?? []);

    // 4) Engine + subs for this year
    const pricingWithSubs =
      buildRainhill2026PricingWithSubs({
        householdId,
        members: memberInputs,
        existingSubscriptions: normalisedSubs,
        seasonYear,
      });

    const engineMatches = pricingWithSubs.matched;

    // All charges the engine says are needed but which don't have a sub attached yet
    const rawChargesToCreate: EngineChargeItem[] = engineMatches
      .filter((m) => !m.subscription)
      .map((m) => m.charge);

    // Extra safety: avoid duplicates against any existing row
    // for this household + year + plan + member/household.
    const existingSameYear = normalisedSubs.filter(
      (s) =>
        s.membership_year === seasonYear &&
        s.household_id === householdId &&
        s.status !== 'cancelled',
    );

    const existingKeySet = new Set(
      existingSameYear.map((s) => {
        const memberKey = s.member_id ?? 'household';
        return `${s.plan_id}::${memberKey}::${s.household_id}`;
      }),
    );

    const chargesToCreate = rawChargesToCreate.filter((charge) => {
      const planId = getPlanIdForCharge(charge);
      const memberKey = charge.memberId ?? 'household';
      const key = `${planId}::${memberKey}::${householdId}`;
      return !existingKeySet.has(key);
    });

    if (chargesToCreate.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message:
            'All membership items for this season are already covered – nothing new to renew.',
        },
        { status: 200 },
      );
    }

    // 5) Create pending subs
    const { data: createdSubs, error: createError } =
      await supabase
        .from('membership_subscriptions')
        .insert(
          chargesToCreate.map((charge) => ({
            club_id: clubId,
            plan_id: getPlanIdForCharge(charge),
            member_id: charge.memberId,
            household_id: householdId,
            status: 'pending',
            membership_year: seasonYear,
            start_date: getSeasonStartDate(clubId, seasonYear),
            end_date: null,
            auto_renews: false,
            amount_pennies: charge.annualPennies,
            discount_pennies: 0,
            stripe_subscription_id: null,
            notes_internal: `Created via renew endpoint for ${seasonYear}`,
          })),
        )
        .select('id');

    if (createError) {
      console.error(
        'Renew: create pending subs error',
        createError,
      );
      return NextResponse.json(
        {
          error: 'Failed to create pending subscriptions for renewal',
          details: createError.message ?? null,
        },
        { status: 500 },
      );
    }

    const subscriptionIds = (createdSubs ?? []).map(
      (s) => s.id as string,
    );

    if (subscriptionIds.length === 0) {
      return NextResponse.json(
        {
          error:
            'No subscriptions were created for renewal – unexpected empty result.',
        },
        { status: 500 },
      );
    }

    // 6) Stripe Checkout
    const origin =
      req.headers.get('origin') ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'https://clubstand.co.uk';

    const successUrl = `${origin}/membership/thank-you?householdId=${householdId}&year=${seasonYear}`;
    const cancelUrl = `${origin}/household/${householdId}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: chargesToCreate.map((charge) => ({
        price: getStripePriceForCharge(charge),
        quantity: 1,
      })),
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        household_id: householdId,
        membership_year: String(seasonYear),
        subscription_ids: subscriptionIds.join(','),
      },
    });

    return NextResponse.json(
      {
        success: true,
        checkoutUrl: session.url,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error('Renew: unexpected error', err);
    return NextResponse.json(
      {
        error: 'Unexpected error in renew endpoint',
        details: err?.message ?? String(err),
      },
      { status: 500 },
    );
  }
}
