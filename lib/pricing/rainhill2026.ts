// lib/pricing/rainhill2026.ts

/**
 * Rainhill CC – 2026 Membership Pricing Engine
 *
 * This is a pure calculation module. It does NOT talk to the database.
 * It takes a list of household members (with DOB, gender, member_type)
 * and returns the cheapest 2026 membership configuration:
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

  // For transparency in the UI / admin
  debug: {
    adultSumPennies: number;
    juniorSumPennies: number;
    socialSumPennies: number;
    adultCount: number;
    adult22PlusCount: number;
    juniorCount: number;
    socialCount: number;
  };
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

/**
 * Core 2026 calculation for Rainhill CC.
 *
 * seasonYear: 2026 means cutoff is 1 September 2025.
 */
export function calculateRainhill2026Pricing(
  members: HouseholdMemberInput[],
  seasonYear: number = 2026,
): RainhillPricingResult {
  // 1st September of the previous year
  const cutoff = new Date(`${seasonYear - 1}-09-01T00:00:00.000Z`);

  // Price constants (pennies)
  const MALE_FULL = 11500; // £115
  const MALE_INT = 9000; // £90
  const FEMALE_FULL = 8000; // £80
  const FEMALE_INT = 8000; // £80

  const JUNIOR_SINGLE = 15600; // £156 (13 x 12)
  const JUNIOR_MULTI = 24000; // £240 (20 x 12)

  const SOCIAL_ADULT = 4500; // £45

  const ADULT_BUNDLE = 15000; // £150 – two adults, 22+, with juniors

  // Categorise members
  const playingAdults: {
    memberId: string;
    band: AdultBand;
    ageOnCutoff: number;
    is22Plus: boolean;
  }[] = [];

  const juniors: { memberId: string; ageOnCutoff: number }[] = [];
  const socials: { memberId: string }[] = [];

  for (const m of members) {
    const age = getAgeOnCutoff(m.date_of_birth, cutoff);

    // Treat 'coach' as non-billed for now
    const isPlayer = m.member_type === 'player';
    const isSupporter = m.member_type === 'supporter';

    // Juniors – under 16 on 1 Sept cutoff
    if (isPlayer && age < 16) {
      juniors.push({ memberId: m.id, ageOnCutoff: age });
      continue;
    }

    // Social adults – supporter 16+
    if (isSupporter && age >= 16) {
      socials.push({ memberId: m.id });
      continue;
    }

    // Playing adults (16+)
    if (isPlayer && age >= 16) {
      const gender = m.gender === 'female' ? 'female' : 'male_or_other';

      let band: AdultBand;
      if (gender === 'female') {
        band = age >= 22 ? 'female_full' : 'female_intermediate';
      } else {
        // Treat 'male' vs 'other' in the same male price band for now.
        band = age >= 22 ? 'male_full' : 'male_intermediate';
      }

      playingAdults.push({
        memberId: m.id,
        band,
        ageOnCutoff: age,
        is22Plus: age >= 22,
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
        price = MALE_FULL;
        break;
      case 'male_intermediate':
        price = MALE_INT;
        break;
      case 'female_full':
        price = FEMALE_FULL;
        break;
      case 'female_intermediate':
        price = FEMALE_INT;
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

  const adult22PlusCount = playingAdults.filter((a) => a.is22Plus).length;
  const juniorCount = juniors.length;

  const adultBundleEligible =
    adult22PlusCount >= 2 && juniorCount >= 1 && adultsWithPrice.length >= 2;

  let adultBundleApplied = false;
  let adultTotalPennies = adultSumPennies;

  if (adultBundleEligible) {
    if (ADULT_BUNDLE < adultSumPennies) {
      adultBundleApplied = true;
      adultTotalPennies = ADULT_BUNDLE;
    }
  }

  // If bundle applied, mark all 22+ adults as covered by the bundle.
  // Any under-22 adult (intermediate) still pays individually on top.
  if (adultBundleApplied) {
    const hasBundleForAllAdults22Plus = true; // current rule: bundle covers all 22+ players

    if (hasBundleForAllAdults22Plus) {
      for (const a of adultsWithPrice) {
        const source = playingAdults.find((p) => p.memberId === a.memberId);
        if (source?.is22Plus) {
          a.coveredByAdultBundle = true;
          a.annualPennies = 0; // cost accounted for in the bundle
        }
      }
    }
    // NOTE: if you later want the bundle to cover exactly 2 adults,
    // you can change this logic to pick the two most expensive 22+ adults.
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
      annualPennies: JUNIOR_SINGLE,
      coveredJuniorIds: [juniors[0].memberId],
    };
    juniorSumPennies = JUNIOR_SINGLE;
  } else if (juniorCount >= 2) {
    juniorsBundle = {
      type: 'multi',
      annualPennies: JUNIOR_MULTI,
      coveredJuniorIds: juniors.map((j) => j.memberId),
    };
    juniorSumPennies = JUNIOR_MULTI;
  }

  // Social adults
  const socialsWithPrice: SocialPricingItem[] = socials.map((s) => ({
    memberId: s.memberId,
    annualPennies: SOCIAL_ADULT,
  }));

  const socialSumPennies = socialsWithPrice.reduce(
    (sum, s) => sum + s.annualPennies,
    0,
  );

  const totalPennies =
    adultTotalPennies + juniorSumPennies + socialSumPennies;

  return {
    seasonYear,
    cutoffDate: cutoff.toISOString().slice(0, 10),
    totalPennies,
    adults: adultsWithPrice,
    adultBundleApplied,
    adultBundleEligible,
    adultBundlePricePennies: ADULT_BUNDLE,
    juniorsBundle,
    socials: socialsWithPrice,
    debug: {
      adultSumPennies,
      juniorSumPennies,
      socialSumPennies,
      adultCount: adultsWithPrice.length,
      adult22PlusCount,
      juniorCount,
      socialCount: socialsWithPrice.length,
    },
  };
}
