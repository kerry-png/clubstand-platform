// lib/pricing/flat.ts

import {
  type HouseholdMemberInput,
  type ClubPricingConfig,
  type RainhillPricingResult,
  type AdultBand,
  type AdultPricingItem,
  type SocialPricingItem,
  type JuniorsBundlePricingItem,
  type JuniorBundleType,
} from './rainhill2026';

import { getAgeOnCutoff } from './rainhill2026';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Flat pricing engine:
 * - No bundles (adult or junior)
 * - Every member is priced individually:
 *   - Adults → by the adult band pricing
 *   - Juniors → junior_single_price_pennies per junior
 *   - Social adults → social_adult_price_pennies
 */
export function calculateFlatPricing(
  members: HouseholdMemberInput[],
  seasonYear: number,
  config: ClubPricingConfig,
): RainhillPricingResult {
  // Work out the cutoff date
  const cutoff = new Date(
    `${seasonYear - 1}-${pad2(config.cutoff_month)}-${pad2(
      config.cutoff_day,
    )}T00:00:00`,
  );

  const adults: AdultPricingItem[] = [];
  const juniors: { memberId: string }[] = [];
  const socials: SocialPricingItem[] = [];

  // Categorise each member the same way Rainhill does
  for (const m of members ?? []) {
    const age = getAgeOnCutoff(m.date_of_birth, cutoff);

    const isPlayer = m.member_type === 'player';
    const isSupporter = m.member_type === 'supporter';

    // Juniors
    if (isPlayer && age <= config.junior_max_age) {
      juniors.push({ memberId: m.id });
      continue;
    }

    // Social adults
    if (isSupporter && age >= config.adult_min_age) {
      socials.push({
        memberId: m.id,
        annualPennies: config.social_adult_price_pennies,
      });
      continue;
    }

    // Adult players
    if (isPlayer && age >= config.adult_min_age) {
      let band: AdultBand;
      const fullAgeThreshold = config.adult_bundle_min_age;

      if (m.gender === 'female') {
        band =
          age >= fullAgeThreshold ? 'female_full' : 'female_intermediate';
      } else {
        band =
          age >= fullAgeThreshold ? 'male_full' : 'male_intermediate';
      }

      let annualPennies = 0;
      switch (band) {
        case 'male_full':
          annualPennies = config.male_full_price_pennies;
          break;
        case 'male_intermediate':
          annualPennies = config.male_intermediate_price_pennies;
          break;
        case 'female_full':
          annualPennies = config.female_full_price_pennies;
          break;
        case 'female_intermediate':
          annualPennies = config.female_intermediate_price_pennies;
          break;
      }

      adults.push({
        memberId: m.id,
        band,
        annualPennies,
        coveredByAdultBundle: false,
      });

      continue;
    }

    // Everyone else → no membership in this pricing mode
  }

  // Price juniors — simple per-head
  const juniorsBundle: JuniorsBundlePricingItem = {
    type: (juniors.length === 0 ? 'none' : 'single') as JuniorBundleType,
    annualPennies: juniors.length * config.junior_single_price_pennies,
    coveredJuniorIds: juniors.map((j) => j.memberId),
  };


  const socialAdultSum = socials.reduce((s, a) => s + a.annualPennies, 0);
  const adultSum = adults.reduce((s, a) => s + a.annualPennies, 0);

  const totalPennies =
    adultSum + juniorsBundle.annualPennies + socialAdultSum;

  // Build breakdown for each member
  const memberBreakdown: RainhillPricingResult['memberBreakdown'] = [];

  for (const a of adults) {
    memberBreakdown.push({
      memberId: a.memberId,
      type: 'adult',
      pricePennies: a.annualPennies,
      coveredByAdultBundle: false,
      coveredByJuniorBundle: false,
      note: 'Adult membership (flat pricing)',
    });
  }

  for (const j of juniors) {
    memberBreakdown.push({
      memberId: j.memberId,
      type: 'junior',
      pricePennies: config.junior_single_price_pennies,
      coveredByAdultBundle: false,
      coveredByJuniorBundle: false,
      note: 'Junior membership (flat pricing)',
    });
  }

  for (const s of socials) {
    memberBreakdown.push({
      memberId: s.memberId,
      type: 'social',
      pricePennies: config.social_adult_price_pennies,
      coveredByAdultBundle: false,
      coveredByJuniorBundle: false,
      note: 'Social membership (flat pricing)',
    });
  }

  return {
    seasonYear,
    cutoffDate: cutoff.toISOString().slice(0, 10),
    totalPennies,
    adults,
    adultBundleApplied: false,
    adultBundleEligible: false,
    adultBundlePricePennies: 0,
    juniorsBundle,
    socials,
    memberBreakdown,
    debug: {
      adultSumPennies: adultSum,
      juniorSumPennies: juniorsBundle.annualPennies,
      socialSumPennies: socialAdultSum,
      adultCount: adults.length,
      adultBundleAdultCount: 0,
      juniorCount: juniors.length,
      socialCount: socials.length,
    },
  };
}
