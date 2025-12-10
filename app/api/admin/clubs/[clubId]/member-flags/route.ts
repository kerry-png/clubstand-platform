// app/api/admin/clubs/[clubId]/member-flags/route.ts
import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canManageMembers } from "@/lib/permissions";

type RouteParams = {
  clubId: string;
};

export async function PUT(
  req: Request,
  context:
    | { params: RouteParams }
    | { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;

  // Next 16: params may be an object or a Promise
  const rawParams: any = (context as any).params;
  const resolvedParams: RouteParams = rawParams?.then
    ? await rawParams
    : rawParams;

  const clubId = resolvedParams?.clubId;

  if (!clubId || clubId === "undefined") {
    return NextResponse.json(
      { error: "Missing club id in URL" },
      { status: 400 },
    );
  }

  // 🔐 Permission check – must be able to manage members/pathway
  const admin = await getCurrentAdminForClub(req, clubId);
  if (!canManageMembers(admin)) {
    return NextResponse.json(
      { error: "Not authorised to update member flags" },
      { status: 403 },
    );
  }

  let body: {
    memberId: string;
    is_county_player?: boolean;
    is_district_player?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { memberId, is_county_player, is_district_player } = body;

  if (!memberId) {
    return NextResponse.json(
      { error: "memberId is required" },
      { status: 400 },
    );
  }

  const updateData: Record<string, boolean> = {};
  if (typeof is_county_player === "boolean") {
    updateData.is_county_player = is_county_player;
  }
  if (typeof is_district_player === "boolean") {
    updateData.is_district_player = is_district_player;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No flags provided to update" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("members")
    .update(updateData)
    .eq("id", memberId)
    .eq("club_id", clubId);

  if (error) {
    console.error("Failed to update member flags", error);
    return NextResponse.json(
      {
        error: "Failed to update member flags",
        details: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
