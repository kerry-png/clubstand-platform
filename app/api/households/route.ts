// app/api/households/route.ts

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";

type CreateHouseholdPayload = {
  clubId: string;
  primary_email: string;
  name?: string | null;
  phone?: string | null;
  postcode?: string | null;
};

export async function POST(req: Request) {
  const supabase = supabaseServerClient;

  let body: CreateHouseholdPayload | null = null;
  try {
    body = (await req.json()) as CreateHouseholdPayload;
  } catch (err) {
    console.error("Create household: invalid JSON", err);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const clubId = body?.clubId;
  const primary_email = body?.primary_email?.trim().toLowerCase();
  const name = body?.name?.trim() || null;
  const phone = body?.phone?.trim() || null;
  const postcode = body?.postcode?.trim() || null;

  if (!clubId || !primary_email) {
    return NextResponse.json(
      { error: "Missing clubId or primary_email" },
      { status: 400 },
    );
  }

  // 1) Try to find an existing household for this club + email
  const { data: existing, error: lookupError } = await supabase
    .from("households")
    .select("id")
    .eq("club_id", clubId)
    .eq("primary_email", primary_email)
    .maybeSingle();

  if (lookupError) {
    console.error("Create household: lookup error", lookupError);
  }

  if (existing?.id) {
    return NextResponse.json(
      { householdId: existing.id, created: false },
      { status: 200 },
    );
  }

  // 2) Create a new household
  const { data: created, error: insertError } = await supabase
    .from("households")
    .insert({
      club_id: clubId,
      primary_email,
      name,
      phone,
      postcode,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    console.error("Create household: insert error", insertError);
    return NextResponse.json(
      {
        error: "Failed to create household",
        details: insertError?.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { householdId: created.id, created: true },
    { status: 200 },
  );
}