// lib/pricing/rainhill2026WithSubs.ts

import { calculateClubPricing } from './index';

import {
  type RainhillPricingResult,
  type AdultPricingItem,
  type SocialPricingItem,
  type HouseholdMemberInput,
  type ClubPricingConfig,
} from './rainhill2026';

export type BillingPeriod = 'annual';

export type RainhillChargeKind =
  | 'adult-bundle'
  | 'adult-topup'
  | 'junior-bundle'
  | 'social-adult';

export interface EngineChargeItem {
  id: string;
  kind: RainhillChargeKind;
  label: string;
  memberId: string | null;
  annualPennies: number;
  billingPeriod: BillingPeriod;
}

export interface SubscriptionRow {
  id: string;
  club_id: string | null;
  plan_id: string;
  member_id: string | null;
  household_id: string;
  status: 'pending' | 'active' | 'cancelled' | string;
  membership_year: number;
  start_date: string | null;
  end_date: string | null;
  auto_renews: boolean | null;
  amount_pennies: number;
  discount_pennies: number;
  stripe_subscription_id: string | null;
  notes_internal: string | null;
}

export interface RainhillPricingWithSubs {
  engine: RainhillPricingResult;
  charges: EngineChargeItem[];

  subscriptions2026: {
    active: SubscriptionRow[];
    pending: SubscriptionRow[];
    cancelled: SubscriptionRow[];
  };

  matched: {
    charge: EngineChargeItem;
    subscription: SubscriptionRow | null;
  }[];

  redundantSubscriptions: SubscriptionRow[];

  memberBreakdown: RainhillPricingResult['memberBreakdown'];

  totals: {
    engineAnnualPennies: number;
    alreadyCoveredAnnualPennies: number; // ACTIVE ONLY
    pendingAnnualPennies: number;        // PENDING ONLY
    remainingAnnualPennies: number;      // engine - active
  };
}

export function buildRainhill2026ChargeItems(
  engine: RainhillPricingResult,
): EngineChargeItem[] {
  const items: EngineChargeItem[] = [];

  if (engine.adultBundleApplied) {
    items.push({
      id: 'adult-bundle',
      kind: 'adult-bundle',
      label: 'Adult bundle (two 22+ with juniors)',
      memberId: null,
      annualPennies: engine.adultBundlePricePennies,
      billingPeriod: 'annual',
    });
  }

  engine.adults.forEach((a: AdultPricingItem) => {
    if (a.annualPennies <= 0) return;
    items.push({
      id: `adult-${a.memberId}`,
      kind: 'adult-topup',
      label: `Adult player (${a.band.replace('_', ' ')})`,
      memberId: a.memberId,
      annualPennies: a.annualPennies,
      billingPeriod: 'annual',
    });
  });

  if (engine.juniorsBundle.type !== 'none') {
    const label =
      engine.juniorsBundle.type === 'single'
        ? 'Junior membership (one junior)'
        : 'Junior bundle (2+ juniors)';

    items.push({
      id: 'junior-bundle',
      kind: 'junior-bundle',
      label,
      memberId: null,
      annualPennies: engine.juniorsBundle.annualPennies,
      billingPeriod: 'annual',
    });
  }

  engine.socials.forEach((s: SocialPricingItem) => {
    items.push({
      id: `social-${s.memberId}`,
      kind: 'social-adult',
      label: 'Social / parent supporter',
      memberId: s.memberId,
      annualPennies: s.annualPennies,
      billingPeriod: 'annual',
    });
  });

  return items;
}

function subscriptionMatchesCharge(
  sub: SubscriptionRow,
  charge: EngineChargeItem,
): boolean {
  const memberMatches =
    charge.memberId === null
      ? sub.member_id === null
      : sub.member_id === charge.memberId;

  return memberMatches;
}

interface MergeOptions {
  householdId: string;
  members: HouseholdMemberInput[];
  existingSubscriptions: SubscriptionRow[];
  seasonYear?: number;
  config?: ClubPricingConfig;
}

export function buildRainhill2026PricingWithSubs(
  options: MergeOptions,
): RainhillPricingWithSubs {
  const {
    householdId,
    members,
    existingSubscriptions,
    seasonYear = 2026,
    config,
  } = options;

  // ⬇️ This now respects pricing_model via calculateClubPricing
  const engine = calculateClubPricing(members, seasonYear, config!);
  const charges = buildRainhill2026ChargeItems(engine);

  // Only seasonYear subs for this household
  const subs2026 = existingSubscriptions.filter(
    (s) =>
      s.household_id === householdId &&
      s.membership_year === seasonYear,
  );

  const active = subs2026.filter((s) => s.status === 'active');
  const pending = subs2026.filter((s) => s.status === 'pending');
  const cancelled = subs2026.filter((s) => s.status === 'cancelled');

  const usedSubIds = new Set<string>();

  const matched = charges.map((charge) => {
    const match = subs2026.find((sub) => {
      if (usedSubIds.has(sub.id)) return false;
      return subscriptionMatchesCharge(sub, charge);
    });

    if (match) usedSubIds.add(match.id);

    return {
      charge,
      subscription: match || null,
    };
  });

  const redundantSubscriptions = subs2026.filter(
    (sub) => !usedSubIds.has(sub.id),
  );

  const engineAnnualPennies = charges.reduce(
    (sum, c) => sum + c.annualPennies,
    0,
  );

  // Correct logic:
  // active = already paid
  // pending = awaiting payment
  // remaining = engine - active
  let activeAnnualPennies = 0;
  let pendingAnnualPennies = 0;

  matched.forEach((m) => {
    const sub = m.subscription;
    if (!sub) return;

    const net =
      (sub.amount_pennies ?? 0) - (sub.discount_pennies ?? 0);
    const safeNet = Math.max(net, 0);

    if (sub.status === 'active') {
      activeAnnualPennies += safeNet;
    } else if (sub.status === 'pending') {
      pendingAnnualPennies += safeNet;
    }
  });

  const remainingAnnualPennies = Math.max(
    engineAnnualPennies - activeAnnualPennies,
    0,
  );

  return {
    engine,
    charges,
    subscriptions2026: {
      active,
      pending,
      cancelled,
    },
    matched,
    redundantSubscriptions,
    memberBreakdown: engine.memberBreakdown,
    totals: {
      engineAnnualPennies,
      alreadyCoveredAnnualPennies: activeAnnualPennies,
      pendingAnnualPennies,
      remainingAnnualPennies,
    },
  };
}
