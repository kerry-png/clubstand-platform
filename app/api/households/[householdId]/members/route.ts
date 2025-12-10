// app/api/households/[householdId]/members/route.ts

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";

type RouteParams = {
  householdId: string;
};

export async function POST(
  req: Request,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;

  // Next 16: params may be an object or a Promise
  const rawParams = (context as any).params;
  const resolvedParams: RouteParams =
    rawParams && typeof (rawParams as any).then === "function"
      ? await (rawParams as Promise<RouteParams>)
      : (rawParams as RouteParams);

  const urlHouseholdId = resolvedParams?.householdId;

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    console.error("Invalid JSON in add-member", err);
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  const clubId: string | undefined = body?.clubId;
  const bodyHouseholdId: string | undefined = body?.householdId;
  const member = body?.member ?? {};

  const householdId = bodyHouseholdId || urlHouseholdId;

  const first_name = (member.first_name || "").trim();
  const last_name = (member.last_name || "").trim();
  const date_of_birth = member.date_of_birth || null;
  const gender = member.gender ?? null;
  const email = member.email ?? null;
  const phone = member.phone ?? null;
  const member_type = (member.member_type as string | undefined) || "player";

  if (!clubId || !householdId) {
    return NextResponse.json(
      { error: "Missing clubId or householdId when adding member." },
      { status: 400 },
    );
  }

  if (!first_name || !last_name) {
    return NextResponse.json(
      { error: "Missing required member name fields." },
      { status: 400 },
    );
  }

  const isPlayer = member_type === "player";

  if (isPlayer && !date_of_birth) {
    return NextResponse.json(
      { error: "Date of birth is required for playing members." },
      { status: 400 },
    );
  }

  try {
    // 1) Create the member row
    const { data: createdMember, error: memberError } = await supabase
      .from("members")
      .insert({
        club_id: clubId,
        household_id: householdId,
        first_name,
        last_name,
        date_of_birth,
        gender,
        email,
        phone,
        member_type, // 'player' or 'supporter'
      })
      .select("id")
      .single();

    if (memberError || !createdMember) {
      console.error("Create household member error", memberError);
      return NextResponse.json(
        { error: "Failed to add this family member." },
        { status: 500 },
      );
    }

    const memberId: string = createdMember.id;

    // 2) We *could* trigger pricing recalculation here, but that's optional.
    // For now, the household screen's "Recalculate pricing" button can do it.

    return NextResponse.json(
      {
        success: true,
        memberId,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Unexpected error in add-member route", err);
    return NextResponse.json(
      { error: "Unexpected error when adding family member." },
      { status: 500 },
    );
  }
}
