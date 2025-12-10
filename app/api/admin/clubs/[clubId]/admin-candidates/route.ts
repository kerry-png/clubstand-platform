// app/api/admin/clubs/[clubId]/admin-candidates/route.ts

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canManageAdmins } from "@/lib/permissions";

type RouteParams = {
  clubId: string;
};

type RouteContext =
  | { params: RouteParams }
  | { params: Promise<RouteParams> }
  | any;

async function resolveParams(context: RouteContext): Promise<RouteParams> {
  const raw = context?.params;
  if (raw && typeof raw.then === "function") {
    return await raw;
  }
  return raw as RouteParams;
}

/**
 * GET /api/admin/clubs/[clubId]/admin-candidates?q=...
 *
 * Returns active members in this club who have user accounts,
 * filtered by name/email, to use when adding admins.
 */
export async function GET(req: Request, context: RouteContext) {
  try {
    const { clubId } = await resolveParams(context);
    const supabase = supabaseServerClient;

    // Permission check – same as admins list
    const admin = await getCurrentAdminForClub(req, clubId);
    if (!canManageAdmins(admin)) {
      return NextResponse.json(
        { error: "Not authorised to manage admins for this club" },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    if (!q) {
      return NextResponse.json({ candidates: [] });
    }

    // Load user-club accounts joined to members for this club
    const { data, error } = await supabase
      .from("user_club_accounts")
      .select(
        `
          user_id,
          member_id,
          members (
            id,
            first_name,
            last_name,
            preferred_name,
            email,
            status
          )
        `,
      )
      .eq("club_id", clubId)
      .not("member_id", "is", null);

    if (error) {
      console.error("admin-candidates query error:", error);
      throw error;
    }

    const rawRows = data || [];

    // Filter in JS:
    //  - active members only
    //  - match on name or email
    const qLower = q.toLowerCase();

    const candidates = rawRows
      .map((row: any) => {
        const m = row.members;
        if (!m) return null;

        const nameParts = [
          m.preferred_name || "",
          m.first_name || "",
          m.last_name || "",
        ].filter(Boolean);

        const displayName =
          nameParts.join(" ").trim() || m.email || "Unknown member";

        const email = (m.email || "").toLowerCase();
        const status = m.status || "inactive";

        return {
          user_id: row.user_id as string,
          member_id: m.id as string,
          display_name: displayName,
          email,
          status,
        };
      })
      .filter((c) => !!c && c.status === "active")
      .filter((c) => {
        const haystack = `${c!.display_name} ${c!.email}`.toLowerCase();
        return haystack.includes(qLower);
      })
      // De-dupe by user_id
      .reduce<Record<string, any>>((acc, c) => {
        if (!c) return acc;
        if (!acc[c.user_id]) acc[c.user_id] = c;
        return acc;
      }, {});

    const uniqueCandidates = Object.values(candidates);

    return NextResponse.json({ candidates: uniqueCandidates });
  } catch (err: any) {
    console.error("GET admin-candidates error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to search admin candidates" },
      { status: 500 },
    );
  }
}
