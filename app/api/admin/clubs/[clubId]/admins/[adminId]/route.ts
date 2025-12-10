// app/api/admin/clubs/[clubId]/admins/[adminId]/route.ts

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canManageAdmins } from "@/lib/permissions";

type RouteParams = {
  clubId: string;
  adminId: string;
};

async function resolveParams(
  context: { params: RouteParams } | { params: Promise<RouteParams> } | any,
): Promise<RouteParams> {
  const raw = context?.params;
  if (raw && typeof raw.then === "function") {
    return await raw;
  }
  return raw as RouteParams;
}

/**
 * PUT /api/admin/clubs/[clubId]/admins/[adminId]
 * Update permissions or super admin flag for a specific admin.
 */
export async function PUT(req: Request, context: any) {
  try {
    const { clubId, adminId } = await resolveParams(context);
    const supabase = supabaseServerClient;

    // Who is making this request?
    const currentAdmin = await getCurrentAdminForClub(req, clubId);
    if (!canManageAdmins(currentAdmin)) {
      return NextResponse.json(
        { error: "Not authorised to update admins for this club" },
        { status: 403 },
      );
    }

    const updates = await req.json();

    // Load existing admin record we are updating
    const { data: existingAdmin, error: fetchErr } = await supabase
      .from("club_admin_users")
      .select("*")
      .eq("id", adminId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!existingAdmin) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 },
      );
    }

    // Safety rule: prevent removal of the last super admin
    if ("is_super_admin" in updates) {
      const becomingFalse = updates.is_super_admin === false;

      if (existingAdmin.is_super_admin && becomingFalse) {
        const { data: supers, error: countErr } = await supabase
          .from("club_admin_users")
          .select("id")
          .eq("club_id", clubId)
          .eq("is_super_admin", true);

        if (countErr) throw countErr;

        if ((supers || []).length <= 1) {
          return NextResponse.json(
            { error: "You cannot remove the last super admin." },
            { status: 400 },
          );
        }
      }
    }

    // Perform the update
    const { error: updateErr } = await supabase
      .from("club_admin_users")
      .update(updates)
      .eq("id", adminId)
      .eq("club_id", clubId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PUT admin update error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update admin" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/clubs/[clubId]/admins/[adminId]
 * Remove an admin from this club.
 */
export async function DELETE(req: Request, context: any) {
  try {
    const { clubId, adminId } = await resolveParams(context);
    const supabase = supabaseServerClient;

    // Who is making this request?
    const currentAdmin = await getCurrentAdminForClub(req, clubId);
    if (!canManageAdmins(currentAdmin)) {
      return NextResponse.json(
        { error: "Not authorised to delete admins for this club" },
        { status: 403 },
      );
    }

    // Load existing admin record we are deleting
    const { data: existingAdmin, error: fetchErr } = await supabase
      .from("club_admin_users")
      .select("*")
      .eq("id", adminId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (!existingAdmin) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 },
      );
    }

    // Safety rule: prevent deleting the last super admin
    if (existingAdmin.is_super_admin) {
      const { data: supers, error: countErr } = await supabase
        .from("club_admin_users")
        .select("id")
        .eq("club_id", clubId)
        .eq("is_super_admin", true);

      if (countErr) throw countErr;

      if ((supers || []).length <= 1) {
        return NextResponse.json(
          { error: "You cannot delete the last super admin." },
          { status: 400 },
        );
      }
    }

    // Perform the delete
    const { error: deleteErr } = await supabase
      .from("club_admin_users")
      .delete()
      .eq("id", adminId)
      .eq("club_id", clubId);

    if (deleteErr) throw deleteErr;

    // A small JSON body keeps the frontend happy even if it doesn't read it
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE admin error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete admin" },
      { status: 500 },
    );
  }
}
