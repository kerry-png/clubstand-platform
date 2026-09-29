import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canEditPayments } from "@/lib/permissions";

function getClubId(request: NextRequest, params?: { clubId?: string }) {
  // Normal case (when Next passes params properly)
  const direct = params?.clubId;
  if (direct && direct !== "undefined") return direct;

  // Fallback: parse from URL path
  // /api/admin/clubs/<clubId>/stripe/status
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  // parts = ["api","admin","clubs","<clubId>","stripe","status"]
  const idx = parts.indexOf("clubs");
  const fromPath = idx >= 0 ? parts[idx + 1] : null;

  if (fromPath && fromPath !== "undefined") return fromPath;
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params?: { clubId?: string } },
) {
  const clubId = getClubId(request, params);

  if (!clubId) {
    return NextResponse.json(
      {
        error: "clubId missing",
        debug: { pathname: request.nextUrl.pathname, params: params ?? null },
      },
      { status: 400 },
    );
  }

  const admin = await getCurrentAdminForClub(request, clubId);
  if (!admin || !canEditPayments(admin)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { data: club, error } = await supabaseAdmin
    .from("clubs")
    .select("id, stripe_account_id")
    .eq("id", clubId)
    .single();

  if (error || !club) {
    return NextResponse.json(
      { error: "Club not found", details: error ?? null, clubId },
      { status: 404 },
    );
  }

  const accountId = club.stripe_account_id as string | null;

  if (!accountId) {
    return NextResponse.json(
      {
        connected: false,
        stripe_account_id: null,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        requirements: null,
      },
      { status: 200 },
    );
  }

  const acct = await stripe.accounts.retrieve(accountId);

  return NextResponse.json(
    {
      connected: true,
      stripe_account_id: acct.id,
      charges_enabled: !!acct.charges_enabled,
      payouts_enabled: !!acct.payouts_enabled,
      details_submitted: !!acct.details_submitted,
      requirements: (acct as any).requirements ?? null,
    },
    { status: 200 },
  );
}
