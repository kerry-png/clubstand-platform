import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getClubId(request: NextRequest, params?: { clubId?: string }) {
  const direct = params?.clubId;
  if (direct && direct !== "undefined") return direct;

  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("clubs");
  const fromPath = idx >= 0 ? parts[idx + 1] : null;
  if (fromPath && fromPath !== "undefined") return fromPath;

  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params?: { clubId?: string } },
) {
  const clubId = getClubId(request, params);

  if (!clubId) {
    return NextResponse.json(
      { error: "clubId missing", debug: { pathname: request.nextUrl.pathname, params: params ?? null } },
      { status: 400 },
    );
  }

  try {
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

    let accountId = club.stripe_account_id as string | null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        metadata: { club_id: clubId },
      });

      accountId = account.id;

      const { error: updateErr } = await supabaseAdmin
        .from("clubs")
        .update({ stripe_account_id: accountId })
        .eq("id", clubId);

      if (updateErr) {
        return NextResponse.json(
          { error: "Failed to save Stripe account id", details: updateErr },
          { status: 500 },
        );
      }
    }

    // IMPORTANT: These URLs must be publicly reachable in production.
    // For local dev, Stripe sometimes rejects localhost depending on settings.
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const returnUrl = `${origin}/admin/clubs/${clubId}/payments/stripe`;
    const refreshUrl = `${origin}/admin/clubs/${clubId}/payments/stripe`;

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: link.url, accountId });
  } catch (e: any) {
    // This will show the real Stripe error message in the browser/network response
    return NextResponse.json(
      {
        error: "Stripe onboarding failed",
        message: e?.message ?? String(e),
        type: e?.type,
        code: e?.code,
        statusCode: e?.statusCode,
        raw: e?.raw,
      },
      { status: 500 },
    );
  }
}
