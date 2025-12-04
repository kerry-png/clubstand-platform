// lib/pricing/index.ts

import { calculateFlatPricing } from './flat';

import {
  calculateRainhill2026Pricing,
  type ClubPricingConfig,
  type HouseholdMemberInput,
  type RainhillPricingResult,
} from './rainhill2026';

// Re-export core types for convenience
export type {
  ClubPricingConfig,
  HouseholdMemberInput,
  RainhillPricingResult,
} from './rainhill2026';

export type ClubPricingResult = RainhillPricingResult;

/**
 * Main entry point for club pricing.
 *
 * For now, all pricing models route to the Rainhill/bundled engine so
 * behaviour stays identical while we build out the other models.
 */
export function calculateClubPricing(
  members: HouseholdMemberInput[],
  seasonYear: number,
  config: ClubPricingConfig,
): ClubPricingResult {
  switch (config.pricing_model) {
    case 'bundled':
      // Rainhill-style bundles + junior multi pricing
      return calculateRainhill2026Pricing(members, seasonYear, config);

    case 'flat':
      // TODO: implement true flat model (no bundles / caps)
      return calculateFlatPricing(members, seasonYear, config);

    case 'family_cap':
      // TODO: implement true family-cap model
      return calculateRainhill2026Pricing(members, seasonYear, config);

    default:
      // Safety net – if config is missing / old, behave like bundled
      return calculateRainhill2026Pricing(members, seasonYear, config);
  }
}
