// app/api/admin/clubs/[clubId]/member-status/route.ts
import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";
import type { Enums } from "@/lib/database.types";

type RouteParams = {
  clubId: string;
};

type MemberStatus = Enums<"member_status">;

export async function PUT(
  req: Request,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
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

  let body: { memberId: string; status: MemberStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { memberId, status } = body;

  if (!memberId || !status) {
    return NextResponse.json(
      { error: "memberId and status are required" },
      { status: 400 },
    );
  }

  const allowed: MemberStatus[] = [
    "active",
    "inactive",
    "prospect",
    "lapsed",
    "banned",
  ];

  if (!allowed.includes(status)) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 },
    );
  }

  // 1) Load existing status so we can log the change
  const { data: existing, error: fetchError } = await supabase
    .from("members")
    .select("status")
    .eq("id", memberId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch existing member status", fetchError);
    // We can still attempt the update, but old_value will be null
  }

  const oldStatus = existing?.status ?? null;

  // 2) Update status
  const { error } = await supabase
    .from("members")
    .update({ status })
    .eq("id", memberId)
    .eq("club_id", clubId);

  if (error) {
    console.error("Failed to update member status", error);
    return NextResponse.json(
      {
        error: "Failed to update member status",
        details: error.message,
      },
      { status: 500 },
    );
  }

  // 3) Insert audit event if status actually changed
  if (oldStatus !== status) {
    const { error: auditError } = await supabase
      .from("member_audit_events")
      .insert({
        club_id: clubId,
        member_id: memberId,
        category: "status",
        field: "status",
        old_value: oldStatus !== null ? { status: oldStatus } : null,
        new_value: { status },
        actor_user_id: null,          // TODO: wire up from auth context
        actor_display_name: null,     // e.g. admin name
        actor_role: null,             // e.g. "club_admin"
        note: null,
      });

    if (auditError) {
      console.error("Failed to insert member status audit event", auditError);
      // We deliberately do NOT fail the request on audit error
    }
  }

  return NextResponse.json({ ok: true });
}
