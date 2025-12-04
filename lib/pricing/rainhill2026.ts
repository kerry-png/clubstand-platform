// lib/pricing/rainhill2026.ts

/**
 * Rainhill CC – 2026 Membership Pricing Engine (config-driven)
 *
 * This is a pure calculation module. It does NOT talk to the database.
 * It takes a list of household members (with DOB, gender, member_type)
 * and returns the cheapest membership configuration for a given season:
 *
 * - Adult playing members
 * - Juniors (single vs multi-junior bundle)
 * - Social adults
 * - Two-adult bundle (if eligible)
 *
 * All amounts are in pennies (GBP).
 */

export type MemberType = 'player' | 'supporter' | 'coach' | 'member';

export type Gender = 'male' | 'female' | 'other' | null;

export type HouseholdMemberInput = {
  id: string;
  date_of_birth: string | null;
  gender: Gender;
  member_type: MemberType;
};

export type AdultBand =
  | 'male_full'
  | 'male_intermediate'
  | 'female_full'
  | 'female_intermediate';

export type JuniorBundleType = 'none' | 'single' | 'multi';

// NEW – which pricing engine the club uses
export type PricingModel = 'bundled' | 'flat' | 'family_cap';

export type AdultPricingItem = {
  memberId: string;
  band: AdultBand;
  annualPennies: number;
  coveredByAdultBundle: boolean;
};

export type JuniorsBundlePricingItem = {
  type: JuniorBundleType;
  annualPennies: number;
  coveredJuniorIds: string[];
};

export type SocialPricingItem = {
  memberId: string;
  annualPennies: number;
};

export type RainhillPricingResult = {
  seasonYear: number;
  cutoffDate: string; // ISO date string for debugging / display
  totalPennies: number;

  adults: AdultPricingItem[];
  adultBundleApplied: boolean;
  adultBundleEligible: boolean;
  adultBundlePricePennies: number;

  juniorsBundle: JuniorsBundlePricingItem;
  socials: SocialPricingItem[];

  // Breakdown for each member (for UI & transparency)
  memberBreakdown: {
    memberId: string;
    type: 'adult' | 'junior' | 'social' | 'none';
    pricePennies: number;
    coveredByAdultBundle: boolean;
    coveredByJuniorBundle: boolean;
    note: string;
  }[];

  // For transparency in the UI / admin
  debug: {
    adultSumPennies: number;
    juniorSumPennies: number;
    socialSumPennies: number;
    adultCount: number;
    adultBundleAdultCount: number;
    juniorCount: number;
    socialCount: number;
  };
};

/**
 * Config that mirrors public.club_pricing_config.
 * This will eventually come from the DB per club + year.
 */
export interface ClubPricingConfig {
  cutoff_month: number; // 1–12
  cutoff_day: number; // 1–31

  junior_max_age: number; // e.g. 15 (so juniors are <= 15 → under 16)
  adult_min_age: number; // e.g. 16
  adult_bundle_min_age: number; // e.g. 22+

  // NEW – which pricing engine this club uses
  pricing_model: PricingModel;

  enable_adult_bundle: boolean;
  require_junior_for_adult_bundle: boolean;
  min_adults_for_bundle: number;

  male_full_price_pennies: number;
  male_intermediate_price_pennies: number;
  female_full_price_pennies: number;
  female_intermediate_price_pennies: number;

  junior_single_price_pennies: number;
  junior_multi_price_pennies: number;

  social_adult_price_pennies: number;

  adult_bundle_price_pennies: number;
}

/**
 * Default config that exactly matches the hard-coded Rainhill 2026 constants
 * that were previously in this file (and your SQL seed row).
 */
export const DEFAULT_RAINHILL_2026_CONFIG: ClubPricingConfig = {
  cutoff_month: 9, // September
  cutoff_day: 1,

  junior_max_age: 15, // juniors are <= 15 (i.e. under 16)
  adult_min_age: 16,
  adult_bundle_min_age: 22,

  pricing_model: 'bundled', // Rainhill uses bundled model by default

  enable_adult_bundle: true,
  require_junior_for_adult_bundle: true,
  min_adults_for_bundle: 2,

  male_full_price_pennies: 11500, // £115
  male_intermediate_price_pennies: 9000, // £90
  female_full_price_pennies: 8000, // £80
  female_intermediate_price_pennies: 8000, // £80

  junior_single_price_pennies: 15600, // £156 (13 x 12)
  junior_multi_price_pennies: 24000, // £240 (20 x 12)

  social_adult_price_pennies: 4500, // £45

  adult_bundle_price_pennies: 15000, // £150 – two adults, 22+, with juniors
};

/**
 * Compute age on a given cutoff date (cricket age).
 * If dob is invalid, returns 0.
 */
export function getAgeOnCutoff(dobIso: string | null, cutoff: Date): number {
  if (!dobIso) return 0;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return 0;

  let age = cutoff.getFullYear() - dob.getFullYear();

  const hasBirthdayAfterCutoff =
    cutoff.getMonth() < dob.getMonth() ||
    (cutoff.getMonth() === dob.getMonth() && cutoff.getDate() < dob.getDate());

  if (hasBirthdayAfterCutoff) {
    age -= 1;
  }

  return age;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Core calculation – now driven by ClubPricingConfig.
 *
 * seasonYear: by default 2026 means cutoff is
 *  [seasonYear - 1]-[cutoff_month]-[cutoff_day]
 * e.g. 2026 → 2025-09-01 for Rainhill.
 *
 * NOTE: config is optional for backwards compatibility; if omitted we use
 * DEFAULT_RAINHILL_2026_CONFIG so existing callers still behave identically.
 */
export function calculateRainhill2026Pricing(
  members: HouseholdMemberInput[],
  seasonYear: number = 2026,
  config?: ClubPricingConfig,
): RainhillPricingResult {
  const cfg: ClubPricingConfig = config ?? DEFAULT_RAINHILL_2026_CONFIG;

  // Cutoff date: previous year + configured month/day
  const cutoffYear = seasonYear - 1;
  const cutoff = new Date(
    `${cutoffYear}-${pad2(cfg.cutoff_month)}-${pad2(cfg.cutoff_day)}T00:00:00.000Z`,
  );

  // Categorise members
  const playingAdults: {
    memberId: string;
    band: AdultBand;
    ageOnCutoff: number;
    isBundleAge: boolean;
  }[] = [];

  const juniors: { memberId: string; ageOnCutoff: number }[] = [];
  const socials: { memberId: string }[] = [];

  for (const m of members ?? []) {
    const age = getAgeOnCutoff(m.date_of_birth, cutoff);

    // Treat 'coach' as non-billed for now
    const isPlayer = m.member_type === 'player';
    const isSupporter = m.member_type === 'supporter';

    // Juniors – age <= junior_max_age
    if (isPlayer && age <= cfg.junior_max_age) {
      juniors.push({ memberId: m.id, ageOnCutoff: age });
      continue;
    }

    // Social adults – supporter age >= adult_min_age
    if (isSupporter && age >= cfg.adult_min_age) {
      socials.push({ memberId: m.id });
      continue;
    }

    // Playing adults – player age >= adult_min_age
    if (isPlayer && age >= cfg.adult_min_age) {
      const gender = m.gender === 'female' ? 'female' : 'male_or_other';
      const fullAgeThreshold = cfg.adult_bundle_min_age; // same as 22+ for Rainhill

      let band: AdultBand;
      if (gender === 'female') {
        band =
          age >= fullAgeThreshold ? 'female_full' : 'female_intermediate';
      } else {
        // Treat 'male' vs 'other' in the same male price band for now.
        band =
          age >= fullAgeThreshold ? 'male_full' : 'male_intermediate';
      }

      playingAdults.push({
        memberId: m.id,
        band,
        ageOnCutoff: age,
        isBundleAge: age >= cfg.adult_bundle_min_age,
      });

      continue;
    }

    // Any other types (e.g. member, coach, junior supporter) – not billed in this engine
  }

  // Adult base pricing (before bundle)
  const adultsWithPrice: AdultPricingItem[] = playingAdults.map((a) => {
    let price = 0;
    switch (a.band) {
      case 'male_full':
        price = cfg.male_full_price_pennies;
        break;
      case 'male_intermediate':
        price = cfg.male_intermediate_price_pennies;
        break;
      case 'female_full':
        price = cfg.female_full_price_pennies;
        break;
      case 'female_intermediate':
        price = cfg.female_intermediate_price_pennies;
        break;
    }
    return {
      memberId: a.memberId,
      band: a.band,
      annualPennies: price,
      coveredByAdultBundle: false,
    };
  });

  const adultSumPennies = adultsWithPrice.reduce(
    (sum, a) => sum + a.annualPennies,
    0,
  );

  const adultBundleAdultCount = playingAdults.filter(
    (a) => a.isBundleAge,
  ).length;
  const juniorCount = juniors.length;

  const adultBundleEligible =
    cfg.enable_adult_bundle &&
    adultBundleAdultCount >= cfg.min_adults_for_bundle &&
    adultsWithPrice.length >= cfg.min_adults_for_bundle &&
    (!cfg.require_junior_for_adult_bundle || juniorCount >= 1);

  let adultBundleApplied = false;
  let adultTotalPennies = adultSumPennies;

  // Track which adults are actually covered by the bundle
  const bundleAdultIds = new Set<string>();

  if (adultBundleEligible) {
    // Only "bundle-age" adults can be part of the bundle
    const bundleAgeAdultsWithPrice = adultsWithPrice.filter((a) => {
      const source = playingAdults.find((p) => p.memberId === a.memberId);
      return source?.isBundleAge;
    });

    if (bundleAgeAdultsWithPrice.length >= cfg.min_adults_for_bundle) {
      // Pick the most expensive bundle-age adults for the bundle
      const sorted = [...bundleAgeAdultsWithPrice].sort(
        (a, b) => b.annualPennies - a.annualPennies,
      );
      const chosenForBundle = sorted.slice(0, cfg.min_adults_for_bundle);
      chosenForBundle.forEach((a) => bundleAdultIds.add(a.memberId));

      // Cost of scenario with bundle:
      // bundle price + all other adults at full price
      const nonBundledPennies = adultsWithPrice
        .filter((a) => !bundleAdultIds.has(a.memberId))
        .reduce((sum, a) => sum + a.annualPennies, 0);

      const bundleScenarioPennies =
        cfg.adult_bundle_price_pennies + nonBundledPennies;

      if (bundleScenarioPennies < adultSumPennies) {
        adultBundleApplied = true;
        adultTotalPennies = bundleScenarioPennies;
      } else {
        // Bundle would not be cheaper than just paying individually
        bundleAdultIds.clear();
      }
    }
  }

  // If bundle applied, mark only the chosen adults as covered
  // and zero their individual price (cost is in the bundle)
  if (adultBundleApplied) {
    for (const a of adultsWithPrice) {
      if (bundleAdultIds.has(a.memberId)) {
        a.coveredByAdultBundle = true;
        a.annualPennies = 0; // cost accounted for in the bundle
      }
    }
  }

  // Junior bundle
  let juniorsBundle: JuniorsBundlePricingItem = {
    type: 'none',
    annualPennies: 0,
    coveredJuniorIds: [],
  };

  let juniorSumPennies = 0;

  if (juniorCount === 1) {
    juniorsBundle = {
      type: 'single',
      annualPennies: cfg.junior_single_price_pennies,
      coveredJuniorIds: [juniors[0].memberId],
    };
    juniorSumPennies = cfg.junior_single_price_pennies;
  } else if (juniorCount >= 2) {
    juniorsBundle = {
      type: 'multi',
      annualPennies: cfg.junior_multi_price_pennies,
      coveredJuniorIds: juniors.map((j) => j.memberId),
    };
    juniorSumPennies = cfg.junior_multi_price_pennies;
  }

  // Social adults
  const socialsWithPrice: SocialPricingItem[] = socials.map((s) => ({
    memberId: s.memberId,
    annualPennies: cfg.social_adult_price_pennies,
  }));

  const socialSumPennies = socialsWithPrice.reduce(
    (sum, s) => sum + s.annualPennies,
    0,
  );

  const totalPennies = adultTotalPennies + juniorSumPennies + socialSumPennies;

  // --- Build member breakdown for UI clarity --- //
  const memberBreakdown: {
    memberId: string;
    type: 'adult' | 'junior' | 'social' | 'none';
    pricePennies: number;
    coveredByAdultBundle: boolean;
    coveredByJuniorBundle: boolean;
    note: string;
  }[] = [];

  // Adults
  for (const a of adultsWithPrice ?? []) {
    memberBreakdown.push({
      memberId: a.memberId,
      type: 'adult',
      pricePennies: a.annualPennies,
      coveredByAdultBundle: !!a.coveredByAdultBundle,
      coveredByJuniorBundle: false,
      note: a.coveredByAdultBundle
        ? 'Covered by adult bundle'
        : a.annualPennies > 0
        ? 'Adult membership'
        : 'Included in adult bundle',
    });
  }

  // Juniors
  for (const j of juniors ?? []) {
    const covered =
      juniorsBundle?.coveredJuniorIds?.includes(j.memberId) ?? false;

    memberBreakdown.push({
      memberId: j.memberId,
      type: 'junior',
      pricePennies: covered ? 0 : juniorsBundle?.annualPennies ?? 0,
      coveredByAdultBundle: false,
      coveredByJuniorBundle: covered,
      note: covered
        ? 'Covered by junior bundle'
        : 'Junior membership',
    });
  }

  // Socials
  for (const s of socialsWithPrice ?? []) {
    memberBreakdown.push({
      memberId: s.memberId,
      type: 'social',
      pricePennies: s.annualPennies,
      coveredByAdultBundle: false,
      coveredByJuniorBundle: false,
      note: 'Social membership',
    });
  }

  // Members not included in any pricing category
  for (const m of members ?? []) {
    const exists = memberBreakdown.some((b) => b.memberId === m.id);
    if (!exists) {
      memberBreakdown.push({
        memberId: m.id,
        type: 'none',
        pricePennies: 0,
        coveredByAdultBundle: false,
        coveredByJuniorBundle: false,
        note: 'No membership required',
      });
    }
  }

  return {
    seasonYear,
    cutoffDate: cutoff.toISOString().slice(0, 10),
    totalPennies,
    memberBreakdown,
    adults: adultsWithPrice,
    adultBundleApplied,
    adultBundleEligible,
    adultBundlePricePennies: cfg.adult_bundle_price_pennies,
    juniorsBundle,
    socials: socialsWithPrice,
    debug: {
      adultSumPennies,
      juniorSumPennies,
      socialSumPennies,
      adultCount: adultsWithPrice.length,
      adultBundleAdultCount,
      juniorCount,
      socialCount: socialsWithPrice.length,
    },
  };
}
