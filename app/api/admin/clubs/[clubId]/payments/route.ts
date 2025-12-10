// app/api/admin/clubs/[clubId]/payments/route.ts

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canViewPayments } from "@/lib/permissions";

// Handle Next 16 Promise-style params
async function resolveParams(context: any) {
  const raw = context.params;
  return typeof raw?.then === "function" ? await raw : raw;
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

    const supabase = supabaseServerClient;

    // Permission check: only payments-capable admins
    const admin = await getCurrentAdminForClub(req, clubId);
    if (!canViewPayments(admin)) {
      return NextResponse.json(
        { error: "Not authorised to view payments for this club" },
        { status: 403 },
      );
    }

    // Determine season year (same logic as stats route)
    let seasonYear: number;
    const url = new URL(req.url);
    const yearParam = url.searchParams.get("year");

    if (yearParam) {
      seasonYear = Number(yearParam);
    } else {
      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("active_season_year")
        .eq("id", clubId)
        .single();

      if (clubError) {
        console.error(
          "Failed to load club for active_season_year",
          clubError,
        );
        return NextResponse.json(
          { error: "Failed to load club configuration" },
          { status: 500 },
        );
      }

      if (!club?.active_season_year) {
        const now = new Date();
        seasonYear = now.getFullYear() + 1;
      } else {
        seasonYear = club.active_season_year;
      }
    }

    const { data, error } = await supabase
      .from("membership_subscriptions")
      .select(
        `
        id,
        club_id,
        status,
        membership_year,
        start_date,
        amount_pennies,
        discount_pennies,
        member_id,
        household_id,
        plan:membership_plans (
          name,
          is_player_plan,
          is_household_plan
        ),
        member:members (
          first_name,
          last_name,
          status,
          member_type,
          email
        ),
        household:households (
          name,
          primary_email
        )
      `,
      )
      .eq("club_id", clubId)
      .eq("membership_year", seasonYear)
      .order("start_date", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []).map((row: any) => ({
      id: row.id as string,
      status: row.status as string,
      membership_year: row.membership_year as number,
      start_date: row.start_date as string | null,
      amount_pennies: row.amount_pennies as number,
      discount_pennies: row.discount_pennies as number,
      member_id: row.member_id as string | null,
      household_id: row.household_id as string | null,
      plan_name: row.plan?.name ?? "",
      is_player_plan: !!row.plan?.is_player_plan,
      is_household_plan: !!row.plan?.is_household_plan,
      member_first_name: row.member?.first_name ?? null,
      member_last_name: row.member?.last_name ?? null,
      member_status: row.member?.status ?? null,
      member_type: row.member?.member_type ?? null,
      member_email: row.member?.email ?? null,
      household_name: row.household?.name ?? null,
      household_email: row.household?.primary_email ?? null,
    }));

    return NextResponse.json({
      seasonYear,
      subscriptions: rows,
    });
  } catch (err: any) {
    console.error("Payments API error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to load payments" },
      { status: 500 },
    );
  }
}
