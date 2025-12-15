// lib/pricing/engine.ts

export type PricingRuleType =
  | "household_cap"
  | "multi_member_discount"
  | "bundle";

export type PlanKind = "adult" | "junior" | "other";

export type PricedItem = {
  planId: string;
  kind: PlanKind;
  amountPennies: number;
};

export type PricingRule = {
  id: string;
  rule_type: PricingRuleType;

  applies_to_plan_ids: string[] | null;
  min_quantity: number | null;

  cap_amount_pennies: number | null;
  discount_amount_pennies: number | null;
  discount_percent: number | null;

  bundle_price_pennies: number | null;
  bundle_adults_required: number | null;
  bundle_juniors_required: number | null;
  bundle_juniors_any: boolean | null;

  priority: number;
  is_active: boolean;
};

export type PricingResult = {
  baseTotalPennies: number;
  finalTotalPennies: number;
  adjustmentPennies: number;
  applied: Array<{
    ruleId: string;
    ruleType: PricingRuleType;
    amountPennies: number;
  }>;
};

export function applyPricingRules(
  items: PricedItem[],
  rules: PricingRule[],
): PricingResult {
  const baseTotal = items.reduce((s, i) => s + i.amountPennies, 0);
  let runningTotal = baseTotal;

  const applied: PricingResult["applied"] = [];

  const activeRules = rules
    .filter((r) => r.is_active)
    .sort((a, b) => a.priority - b.priority);

  // ---- BUNDLES (exclusive, first match wins) ----
  const bundles = activeRules.filter((r) => r.rule_type === "bundle");

  for (const bundle of bundles) {
    const adults = items.filter((i) => i.kind === "adult").length;
    const juniors = items.filter((i) => i.kind === "junior").length;

    const adultsReq = bundle.bundle_adults_required ?? 0;
    const juniorsReq = bundle.bundle_juniors_required ?? 0;
    const juniorsAny = !!bundle.bundle_juniors_any;

    const matchAdults = adultsReq === 0 || adults >= adultsReq;
    const matchJuniors = juniorsAny
      ? juniors >= 1
      : juniorsReq === 0 || juniors >= juniorsReq;

    if (
      matchAdults &&
      matchJuniors &&
      (bundle.bundle_price_pennies ?? 0) > 0
    ) {
      const bundleTotal = bundle.bundle_price_pennies!;
      const delta = bundleTotal - runningTotal;

      return {
        baseTotalPennies: baseTotal,
        finalTotalPennies: Math.max(0, bundleTotal),
        adjustmentPennies: delta,
        applied: [
          {
            ruleId: bundle.id,
            ruleType: "bundle",
            amountPennies: delta,
          },
        ],
      };
    }
  }

  // ---- MULTI-MEMBER DISCOUNTS ----
  for (const rule of activeRules.filter(
    (r) => r.rule_type === "multi_member_discount",
  )) {
    const eligible = items.filter(
      (i) =>
        !rule.applies_to_plan_ids ||
        rule.applies_to_plan_ids.includes(i.planId),
    );

    const fromN = Math.max(2, rule.min_quantity ?? 2);
    const discountableCount = Math.max(0, eligible.length - (fromN - 1));

    if (discountableCount === 0) continue;

    let discount = 0;

    if ((rule.discount_amount_pennies ?? 0) > 0) {
      discount = rule.discount_amount_pennies! * discountableCount;
    } else if ((rule.discount_percent ?? 0) > 0) {
      const sorted = [...eligible].sort((a, b) => a.amountPennies - b.amountPennies);
      const target = sorted.slice(0, discountableCount);
      discount = target.reduce(
        (s, it) => s + Math.round(it.amountPennies * (rule.discount_percent! / 100)),
        0,
      );
    }

    runningTotal -= discount;

    applied.push({
      ruleId: rule.id,
      ruleType: "multi_member_discount",
      amountPennies: -discount,
    });
  }

  // ---- HOUSEHOLD CAP ----
  const cap = activeRules.find((r) => r.rule_type === "household_cap");

  if (cap && (cap.cap_amount_pennies ?? 0) > 0) {
    if (runningTotal > cap.cap_amount_pennies!) {
      const delta = cap.cap_amount_pennies! - runningTotal;
      runningTotal = cap.cap_amount_pennies!;

      applied.push({
        ruleId: cap.id,
        ruleType: "household_cap",
        amountPennies: delta,
      });
    }
  }

  return {
    baseTotalPennies: baseTotal,
    finalTotalPennies: Math.max(0, runningTotal),
    adjustmentPennies: runningTotal - baseTotal,
    applied,
  };
}
