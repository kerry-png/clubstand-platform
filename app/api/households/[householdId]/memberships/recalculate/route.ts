// app/api/households/[householdId]/memberships/recalculate/route.ts

import { NextResponse } from "next/server";
import { requireHouseholdAccess } from "@/lib/auth/householdAccess";
import { applyPricingRules, type PricingRule, type PricedItem } from "@/lib/pricing";
import { DEFAULT_MEMBERSHIP_SETTINGS, currentMembershipYear, isJunior } from "@/lib/membership/rules";

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


export async function POST(
  req: Request,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
) {

  const rawParams: any = (context as any).params;
  const resolvedParams: RouteParams = rawParams?.then ? await rawParams : rawParams;

  const householdId = resolvedParams?.householdId;
  if (!householdId || householdId === "undefined") {
    return NextResponse.json({ error: "Missing household id in URL" }, { status: 400 });
  }

  const access = await requireHouseholdAccess(householdId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const supabase = access.supabase;
  const clubId = access.household.club_id as string;

  const body = await req.json().catch(() => null);
  const { data: settingsRow } = await supabase.from("club_membership_settings").select("*").eq("club_id", clubId).maybeSingle();
  const settings = { ...DEFAULT_MEMBERSHIP_SETTINGS, ...(settingsRow ?? {}) };
  const defaultYear = currentMembershipYear(new Date(), settings);
  const seasonYear = Number(body?.seasonYear ?? defaultYear) || defaultYear;


  const { data: rawSubs, error: subsError } = await supabase
    .from("membership_subscriptions")
    .select("id, club_id, plan_id, member_id, household_id, status, membership_year, amount_pennies, discount_pennies")
    .eq("household_id", householdId)
    .eq("membership_year", seasonYear);

  if (subsError) {
    console.error("Recalc: subscriptions load error", subsError);
    return NextResponse.json(
      { error: "Failed to load household subscriptions", details: subsError.message },
      { status: 500 },
    );
  }

  const subs: RawSubscription[] = (rawSubs ?? []) as any;

  if (!clubId) {
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

  const { data: rulesRows, error: rulesErr } = await supabase
    .from("pricing_rules")
    .select("*")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (rulesErr) {
    console.error("Recalc: pricing_rules load error", rulesErr);
    return NextResponse.json(
      { error: "Failed to load pricing rules", details: rulesErr.message },
      { status: 500 },
    );
  }

  const pricingRules = (rulesRows ?? []) as unknown as PricingRule[];

  const planIds = Array.from(new Set(subs.map((s) => s.plan_id).filter(Boolean)));
  const { data: plansRows, error: plansErr } = await supabase
    .from("membership_plans")
    .select("id, is_player_plan, is_junior_only")
    .in("id", planIds);

  if (plansErr) {
    console.error("Recalc: membership_plans load error", plansErr);
    return NextResponse.json(
      { error: "Failed to load membership plans", details: plansErr.message },
      { status: 500 },
    );
  }

  const planById = new Map((plansRows ?? []).map((p: any) => [p.id, p]));

  const memberIds = Array.from(new Set(subs.map((s) => s.member_id).filter(Boolean))) as string[];
  const { data: memberRows } = memberIds.length ? await supabase.from("members").select("id,date_of_birth,member_type").in("id", memberIds) : { data: [] as any[] };
  const memberById = new Map((memberRows ?? []).map((m:any)=>[m.id,m]));

  const items: PricedItem[] = subs.map((s) => {
    const plan = planById.get(s.plan_id);
    const member:any = s.member_id ? memberById.get(s.member_id) : null;
    const junior = member?.date_of_birth ? isJunior(member.date_of_birth, seasonYear, settings) : null;
    const kind = plan?.is_player_plan ? (junior === true ? "junior" : "adult") : "other";
    return {
      subscriptionId: s.id,
      memberId: s.member_id ?? undefined,
      planId: s.plan_id,
      kind,
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