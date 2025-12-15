// app/api/households/[householdId]/pricing/route.ts

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";
import { applyPricingRules, type PricingRule, type PricedItem } from "@/lib/pricing";

type RouteParams = { householdId: string };

type RawSubscription = {
  id: string;
  club_id: string | null;
  plan_id: string;
  member_id: string | null;
  household_id: string;
  status: string;
  membership_year: number | null;
  amount_pennies: number | null;
  discount_pennies: number | null;
};

function planKindFromPlan(plan: any): "adult" | "junior" | "other" {
  if (plan?.is_player_plan && plan?.is_junior_only) return "junior";
  if (plan?.is_player_plan) return "adult";
  return "other";
}

async function getHouseholdClubId(householdId: string): Promise<string | null> {
  const { data, error } = await supabaseServerClient
    .from("membership_subscriptions")
    .select("club_id")
    .eq("household_id", householdId)
    .not("club_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getHouseholdClubId error", error);
    return null;
  }
  return (data?.club_id as string | null) ?? null;
}

export async function GET(
  req: Request,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;

  const rawParams: any = (context as any).params;
  const resolvedParams: RouteParams = rawParams?.then ? await rawParams : rawParams;

  const householdId = resolvedParams?.householdId;
  if (!householdId || householdId === "undefined") {
    return NextResponse.json({ error: "Missing household id in URL" }, { status: 400 });
  }

  const url = new URL(req.url);
  const seasonYearParam = url.searchParams.get("seasonYear");
  const seasonYear = seasonYearParam ? Number(seasonYearParam) || 2026 : 2026;

  const clubId = await getHouseholdClubId(householdId);

  // 1) Load subs for household/year
  const { data: rawSubs, error: subsError } = await supabase
    .from("membership_subscriptions")
    .select("id, club_id, plan_id, member_id, household_id, status, membership_year, amount_pennies, discount_pennies")
    .eq("household_id", householdId)
    .eq("membership_year", seasonYear);

  if (subsError) {
    console.error("Pricing: subscriptions load error", subsError);
    return NextResponse.json(
      { error: "Failed to load household subscriptions", details: subsError.message },
      { status: 500 },
    );
  }

  const subs: RawSubscription[] = (rawSubs ?? []) as any;

  if (!clubId) {
    // No club yet (should be rare). Return simple totals.
    const baseTotal = subs.reduce((s, r) => s + Number(r.amount_pennies ?? 0), 0);
    return NextResponse.json(
      {
        success: true,
        householdId,
        seasonYear,
        clubId: null,
        baseTotalPennies: baseTotal,
        finalTotalPennies: baseTotal,
        adjustmentPennies: 0,
        applied: [],
        subscriptions: subs,
      },
      { status: 200 },
    );
  }

  // 2) Load pricing rules
  const { data: rulesRows, error: rulesErr } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (rulesErr) {
    console.error("Pricing: pricing_rules load error", rulesErr);
    return NextResponse.json(
      { error: "Failed to load pricing rules", details: rulesErr.message },
      { status: 500 },
    );
  }

  const pricingRules = (rulesRows ?? []) as unknown as PricingRule[];

  // 3) Load plan metadata so we can classify adult/junior
  const planIds = Array.from(new Set(subs.map((s) => s.plan_id).filter(Boolean)));
  const { data: plansRows, error: plansErr } = await supabase
    .from("membership_plans")
    .select("id, is_player_plan, is_junior_only")
    .in("id", planIds);

  if (plansErr) {
    console.error("Pricing: membership_plans load error", plansErr);
    return NextResponse.json(
      { error: "Failed to load membership plans", details: plansErr.message },
      { status: 500 },
    );
  }

  const planById = new Map((plansRows ?? []).map((p: any) => [p.id, p]));

  // 4) Build items from subscription base amounts
  const items: PricedItem[] = subs.map((s) => {
    const plan = planById.get(s.plan_id);
    return {
      planId: s.plan_id,
      kind: planKindFromPlan(plan),
      amountPennies: Number(s.amount_pennies ?? 0),
    };
  });

  const pricing = applyPricingRules(items, pricingRules);

  return NextResponse.json(
    {
      success: true,
      householdId,
      seasonYear,
      clubId,
      baseTotalPennies: pricing.baseTotalPennies,
      finalTotalPennies: pricing.finalTotalPennies,
      adjustmentPennies: pricing.adjustmentPennies,
      applied: pricing.applied,
      subscriptions: subs,
    },
    { status: 200 },
  );
}
