// app/api/admin/clubs/[clubId]/offline-payments/route.ts

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canViewPayments, canEditPayments } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

// Handle Next 16 Promise-style params
async function resolveParams(context: any) {
  const raw = context.params;
  return typeof raw?.then === "function" ? await raw : raw;
}

const ALLOWED_METHODS = new Set(["cash", "bacs", "cheque"]);

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseMonthsParam(url: URL): { months: number | null; mode: "range" | "all" } {
  const raw = (url.searchParams.get("months") ?? "").trim().toLowerCase();
  if (!raw || raw === "3") return { months: 3, mode: "range" }; // sensible default
  if (raw === "all") return { months: null, mode: "all" };

  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return { months: Math.floor(n), mode: "range" };

  // fallback
  return { months: 3, mode: "range" };
}

export async function GET(req: Request, context: any) {
  try {
    const { clubId } = await resolveParams(context);

    if (!clubId) {
      return NextResponse.json(
        { error: "Missing clubId in route params" },
        { status: 400 },
      );
    }

    const admin = await getCurrentAdminForClub(req, clubId);
    if (!admin || !canViewPayments(admin)) {
      return NextResponse.json(
        { error: "Not authorised to view payments for this club" },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const { months, mode } = parseMonthsParam(url);

    let fromDate: string | null = null;
    if (mode === "range" && months) {
      const d = new Date();
      d.setMonth(d.getMonth() - months);
      fromDate = ymd(d);
    }

    // Build query once, apply optional range filter
    let q = supabaseServerClient
      .from("offline_payments")
      .select(
        `
        id,
        club_id,
        household_id,
        member_id,
        amount_pennies,
        currency,
        method,
        reference,
        notes,
        paid_on,
        recorded_by,
        created_at,
        household:households (
          id,
          name,
          primary_email
        ),
        member:members (
          id,
          first_name,
          last_name
        )
      `,
        { count: "exact" },
      )
      .eq("club_id", clubId);

    if (fromDate) {
      q = q.gte("paid_on", fromDate);
    }

    // v1: return up to 200 rows (clubs won't have thousands; paging can be phase 2)
    const {
      data: payments,
      error: paymentsError,
      count,
    } = await q
      .order("paid_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (paymentsError) throw paymentsError;

    const { data: households, error: householdsError } = await supabaseServerClient
      .from("households")
      .select("id, name, primary_email, secondary_email")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (householdsError) throw householdsError;

    const householdIds = (households ?? []).map((h: any) => h.id);

    let membersByHousehold: Record<
      string,
      { id: string; first_name: string; last_name: string; status: string; member_type: string }[]
    > = {};

    if (householdIds.length > 0) {
      const { data: members, error: membersError } = await supabaseServerClient
        .from("members")
        .select("id, household_id, first_name, last_name, status, member_type")
        .eq("club_id", clubId)
        .in("household_id", householdIds)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (membersError) throw membersError;

      membersByHousehold = (members ?? []).reduce((acc: any, m: any) => {
        if (!m.household_id) return acc;
        acc[m.household_id] = acc[m.household_id] ?? [];
        acc[m.household_id].push(m);
        return acc;
      }, {});
    }

    return NextResponse.json({
      offlinePayments: payments ?? [],
      offlinePaymentsTotal: count ?? 0,
      months: mode === "all" ? "all" : months ?? 3,
      households: households ?? [],
      membersByHousehold,
      canEdit: canEditPayments(admin),
    });
  } catch (err: any) {
    console.error("Offline payments GET error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to load offline payments" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, context: any) {
  try {
    const { clubId } = await resolveParams(context);

    if (!clubId) {
      return NextResponse.json(
        { error: "Missing clubId in route params" },
        { status: 400 },
      );
    }

    const supabaseAuth = await createClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const admin = await getCurrentAdminForClub(req, clubId);
    if (!admin || !canEditPayments(admin)) {
      return NextResponse.json(
        { error: "Not authorised to record offline payments for this club" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const household_id = String(body.household_id ?? "");
    const amount_pennies = Number(body.amount_pennies ?? NaN);
    const method = String(body.method ?? "").toLowerCase();
    const paid_on = String(body.paid_on ?? "");
    const member_id =
      body.member_id === null || body.member_id === undefined || body.member_id === ""
        ? null
        : String(body.member_id);

    const reference =
      body.reference === null || body.reference === undefined
        ? null
        : String(body.reference);

    const notes =
      body.notes === null || body.notes === undefined ? null : String(body.notes);

    if (!household_id) {
      return NextResponse.json({ error: "household_id is required" }, { status: 400 });
    }
    if (!Number.isFinite(amount_pennies) || amount_pennies <= 0) {
      return NextResponse.json(
        { error: "amount_pennies must be a positive number" },
        { status: 400 },
      );
    }
    if (!ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        { error: "method must be one of: cash, bacs, cheque" },
        { status: 400 },
      );
    }
    if (!paid_on || Number.isNaN(Date.parse(paid_on))) {
      return NextResponse.json(
        { error: "paid_on must be a valid date (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseServerClient
      .from("offline_payments")
      .insert({
        club_id: clubId,
        household_id,
        member_id,
        amount_pennies,
        method,
        paid_on,
        reference,
        notes,
        recorded_by: user.id,
      })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error("Offline payments POST error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to record offline payment" },
      { status: 500 },
    );
  }
}
