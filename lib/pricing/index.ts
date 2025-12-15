// lib/pricing/index.ts
//
// Single public entry point for all pricing logic.
// All clubs (including Rainhill) use the same rules-based engine.
// No club-specific logic lives here.

export type {
  PricingRuleType,
  PlanKind,
  PricedItem,
  PricingRule,
  PricingResult,
} from "./engine";

export { applyPricingRules } from "./engine";
