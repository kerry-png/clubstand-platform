import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentAdminForClub } from "@/lib/admins";

type Params = { clubId: string };
type Props = { params: Promise<Params> };

function canManagePricing(admin: any) {
  return !!admin?.is_super_admin || !!admin?.can_manage_pricing;
}

export async function GET(_req: Request, { params }: Props) {
  const { clubId } = await params;

  const admin = await getCurrentAdminForClub(null, clubId);
  if (!admin || !canManagePricing(admin)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data, error } = await supabaseServerClient
    .from("pricing_rules")
    .select("*")
    .eq("club_id", clubId)
    .order("priority", { ascending: true });

  if (error) {
    console.error("pricing-rules GET error", error);
    return NextResponse.json({ error: "Failed to load pricing rules" }, { status: 500 });
  }

  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(req: Request, { params }: Props) {
  const { clubId } = await params;

  const admin = await getCurrentAdminForClub(null, clubId);
  if (!admin || !canManagePricing(admin)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const rules = (body?.rules ?? []) as any[];

  if (!Array.isArray(rules) || rules.length === 0) {
    return NextResponse.json({ error: "No rules supplied" }, { status: 400 });
  }

  // Enforce exclusivity server-side as well
  const capActive = rules.some((r) => r.rule_type === "household_cap" && r.is_active);
  const bundleActive = rules.some((r) => r.rule_type === "bundle" && r.is_active);

  const normalised = rules.map((r) => {
    const isExclusive = r.rule_type === "household_cap" || r.rule_type === "bundle";
    const isActive =
      r.rule_type === "household_cap" && bundleActive ? false
      : r.rule_type === "bundle" && capActive ? false
      : !!r.is_active;

    return {
      id: r.id || undefined,
      club_id: clubId,
      rule_type: r.rule_type,
      applies_to_plan_ids: r.applies_to_plan_ids ?? null,
      min_quantity: r.min_quantity ?? null,
      cap_amount_pennies: r.cap_amount_pennies ?? null,
      discount_amount_pennies: r.discount_amount_pennies ?? null,
      discount_percent: r.discount_percent ?? null,
      bundle_price_pennies: r.bundle_price_pennies ?? null,
      bundle_adults_required: r.bundle_adults_required ?? null,
      bundle_juniors_required: r.bundle_juniors_required ?? null,
      bundle_juniors_any: r.bundle_juniors_any ?? null,
      is_exclusive: isExclusive,
      priority: r.priority ?? 100,
      is_active: isActive,
    };
  });

  const { data, error } = await supabaseServerClient
    .from("pricing_rules")
    .upsert(normalised, { onConflict: "id" })
    .select("*")
    .eq("club_id", clubId)
    .order("priority", { ascending: true });

  if (error) {
    console.error("pricing-rules POST error", error);
    return NextResponse.json({ error: "Failed to save pricing rules" }, { status: 500 });
  }

  return NextResponse.json({ rules: data ?? [] });
}
