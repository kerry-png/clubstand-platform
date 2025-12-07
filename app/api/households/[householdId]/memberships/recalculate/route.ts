// app/api/households/[householdId]/memberships/recalculate/route.ts

import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { type HouseholdMemberInput } from '@/lib/pricing/rainhill2026';
import {
  buildRainhill2026PricingWithSubs,
  type SubscriptionRow,
  type EngineChargeItem,
  type RainhillChargeKind,
} from '@/lib/pricing/rainhill2026WithSubs';

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

function normaliseSubs(rawSubs: RawSubscription[]): SubscriptionRow[] {
  return rawSubs.map((s) => ({
    id: s.id,
    club_id: s.club_id,
    plan_id: s.plan_id,
    member_id: s.member_id,
    household_id: s.household_id,
    status: s.status as SubscriptionRow['status'],
    membership_year:
      typeof s.membership_year === 'number' ? s.membership_year : 0,
    start_date: s.start_date,
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
    throw new Error(`Failed to load household club_id: ${error.message}`);
  }

  return data?.club_id as string | null;
}

/**
 * Load mapping of charge_kind → membership_plan_id for a given club + year.
 * Data comes from club_membership_charge_mappings.
 */
async function getChargePlanMappings(
  clubId: string,
  membershipYear: number,
): Promise<Record<RainhillChargeKind, string>> {
  const { data, error } = await supabaseServerClient
    .from('club_membership_charge_mappings')
    .select('charge_kind, membership_year, membership_plan_id')
    .eq('club_id', clubId)
    .eq('membership_year', membershipYear);

  if (error) {
    throw new Error(
      `Failed to load charge plan mappings: ${error.message}`,
    );
  }

  const map: Record<RainhillChargeKind, string> = {} as any;

  (data ?? []).forEach((row: any) => {
    const kind = row.charge_kind as RainhillChargeKind;
    map[kind] = row.membership_plan_id as string;
  });

  return map;
}

function getSeasonStartDate(_clubId: string, seasonYear: number): string {
  // Future: look up per-club season start in a config table.
  // For now, treat membership year as starting on 1st January of that year.
  return `${seasonYear}-01-01`;
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
            'Household has no club_id – cannot recalculate subscriptions',
        },
        { status: 400 },
      );
    }

    // 2) Members for this household
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, date_of_birth, gender, member_type')
      .eq('household_id', householdId);

    if (membersError) {
      console.error('Recalc: members load error', membersError);
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
    const { data: rawSubs, error: subsError } = await supabase
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
      console.error('Recalc: subscriptions load error', subsError);
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
    const pricingWithSubs = buildRainhill2026PricingWithSubs({
      householdId,
      members: memberInputs,
      existingSubscriptions: normalisedSubs,
      seasonYear,
    });

    const engineMatches = pricingWithSubs.matched;

    // Load plan mappings for this club + year (generic, non-Rainhill)
    const planMappings = await getChargePlanMappings(clubId, seasonYear);

    // Charges the engine says are needed but which don't have a sub yet
    const rawChargesToCreate: EngineChargeItem[] = engineMatches
      .filter((m) => !m.subscription)
      .map((m) => m.charge);

    // Existing subs in this year for safety checks
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
      const planId = planMappings[charge.kind];
      if (!planId) {
        // If a mapping is missing for a charge kind, we skip creating it.
        console.error(
          `Recalc: no plan mapping for charge kind "${charge.kind}" (club_id=${clubId}, year=${seasonYear})`,
        );
        return false;
      }
      const memberKey = charge.memberId ?? 'household';
      const key = `${planId}::${memberKey}::${householdId}`;
      return !existingKeySet.has(key);
    });

    // Redundant pending subs for this year (engine no longer wants them)
    const redundantPending = pricingWithSubs.redundantSubscriptions.filter(
      (sub) =>
        sub.status === 'pending' &&
        sub.membership_year === seasonYear &&
        sub.household_id === householdId,
    );

    // 5) Insert missing pending subs
    let createdSubs: { id: string }[] = [];
    if (chargesToCreate.length > 0) {
      const { data: created, error: createError } = await supabase
        .from('membership_subscriptions')
        .insert(
          chargesToCreate.map((charge) => {
            const planId = planMappings[charge.kind];
            if (!planId) {
              throw new Error(
                `Missing plan mapping when inserting sub for charge kind "${charge.kind}"`,
              );
            }

            return {
              club_id: clubId,
              plan_id: planId,
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
              notes_internal: `Created via recalc endpoint for ${seasonYear}`,
            };
          }),
        )
        .select('id');

      if (createError) {
        console.error('Recalc: create pending subs error', createError);
        return NextResponse.json(
          {
            error: 'Failed to create pending subscriptions',
            details: createError.message,
          },
          { status: 500 },
        );
      }

      createdSubs = created ?? [];
    }

    // 6) Optionally cancel redundant pending subs
    let cancelledIds: string[] = [];
    if (redundantPending.length > 0) {
      const ids = redundantPending.map((s) => s.id);
      const { error: cancelError } = await supabase
        .from('membership_subscriptions')
        .update({
          status: 'cancelled',
          notes_internal:
            'Marked cancelled by recalc endpoint – no matching charge for this season',
        })
        .in('id', ids);

      if (cancelError) {
        console.error('Recalc: cancel pending subs error', cancelError);
        // Non-fatal; we still return success but mention it
        cancelledIds = [];
      } else {
        cancelledIds = ids;
      }
    }

    return NextResponse.json(
      {
        success: true,
        seasonYear,
        createdCount: createdSubs.length,
        createdIds: createdSubs.map((s) => s.id),
        cancelledCount: cancelledIds.length,
        cancelledIds,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error('Recalc: unexpected error', err);
    return NextResponse.json(
      {
        error: 'Unexpected error in recalc endpoint',
        details: err?.message ?? String(err),
      },
      { status: 500 },
    );
  }
}
