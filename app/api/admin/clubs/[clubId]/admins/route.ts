//app/api/admin/clubs/[clubId]/admins/route.ts

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canManageAdmins } from "@/lib/permissions";
import { randomUUID } from "crypto";



// Resolve params (handles Promise in your Next.js config)
async function resolveParams(context: any) {
  const raw = context.params;
  return typeof raw?.then === "function" ? await raw : raw;
}

/**
 * GET /admins → list admins for this club
 */
export async function GET(req: Request, context: any) {
  try {
    const { clubId } = await resolveParams(context);
    const supabase = supabaseServerClient;

    // Permission check: only admins with can_manage_admins (or super admins) can view
   // const admin = await getCurrentAdminForClub(req, clubId);
   // if (!canManageAdmins(admin)) {
   //   return NextResponse.json(
   //     { error: "Not authorised to manage admins for this club" },
   //     { status: 403 },
   //   );
   // }

    const { data, error } = await supabase
      .from("club_admin_users")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at");

    if (error) throw error;

    return NextResponse.json({ admins: data });
  } catch (err: any) {
    console.error("GET admins error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load admins" },
      { status: 500 }
    );
  }
}

/**
 * POST /admins → add admin by email
 * Requires user to already exist in Supabase Auth.
 */
export async function POST(req: Request, context: any) {
  try {
    const { clubId } = await resolveParams(context);
    const supabase = supabaseServerClient;

    const admin = await getCurrentAdminForClub(req, clubId);
    if (!canManageAdmins(admin)) {
      return NextResponse.json(
        { error: "Not authorised to add admins for this club" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    // 1) Prevent duplicate admins for this club by email
    const { data: existingAdmin, error: dupErr } = await supabase
      .from("club_admin_users")
      .select("id")
      .eq("club_id", clubId)
      .eq("email", email)
      .maybeSingle();

    if (dupErr) throw dupErr;

    if (existingAdmin) {
      return NextResponse.json(
        { error: "This email is already an admin for this club." },
        { status: 400 },
      );
    }

    // 2) Insert admin with a generated user_id (save-only mode)
    const fakeUserId = randomUUID();

    const { error: insertErr } = await supabase
      .from("club_admin_users")
      .insert({
        club_id: clubId,
        user_id: fakeUserId,
        email,
        display_name: null,
        is_super_admin: false,
        can_view_juniors: false,
        can_edit_juniors: false,
        can_view_dashboard: false,
        can_view_payments: false,
        can_edit_payments: false,
        can_manage_admins: false,
        can_manage_members: false,
        can_manage_safeguarding: false,
        can_manage_plans: false,
        can_manage_pricing: false,
      });

    if (insertErr) throw insertErr;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("POST admins error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to add admin" },
      { status: 500 },
    );
  }
}

