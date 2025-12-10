// app/api/admin/clubs/[clubId]/current-admin/route.ts

import { NextResponse } from "next/server";
import { getCurrentAdminForClub } from "@/lib/admins";

type RouteParams = {
  clubId: string;
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
 * GET /api/admin/clubs/[clubId]/current-admin
 *
 * Returns the club_admin_users row for the *current logged-in user*
 * for this club, or null if they are not an admin.
 */
export async function GET(req: Request, context: any) {
  try {
    const { clubId } = await resolveParams(context);

    const admin = await getCurrentAdminForClub(req, clubId);

    // We don't block here – pages themselves handle authorisation.
    // This endpoint is just for the sidebar to decide what to show.
    return NextResponse.json({ admin });
  } catch (err: any) {
    console.error("current-admin GET error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load current admin" },
      { status: 500 },
    );
  }
}