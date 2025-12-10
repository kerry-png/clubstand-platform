// app/api/payments/checkout/route.ts

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServerClient } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { householdId } = await req.json();
    if (!householdId) {
      return NextResponse.json(
        { error: "Missing householdId" },
        { status: 400 }
      );
    }

    // Load household
    const { data: household, error: householdErr } =
      await supabaseServerClient
        .from("households")
        .select("id, club_id")
        .eq("id", householdId)
        .single();

    if (householdErr || !household) {
      return NextResponse.json(
        { error: "Household not found" },
        { status: 404 }
      );
    }

    const clubId = household.club_id;

    // Load pending subscriptions for this household
    const { data: pendingSubs, error: pendingErr } =
      await supabaseServerClient
        .from("membership_subscriptions")
        .select(
          `
          id,
          plan_id,
          membership_year,
          amount_pennies,
          discount_pennies,
          plan:membership_plans (
            id,
            name,
            stripe_price_id_annual
          )
        `
        )
        .eq("household_id", householdId)
        .eq("status", "pending");

    if (pendingErr) {
      console.error("Failed loading pending subs", pendingErr);
      return NextResponse.json(
        { error: "Failed loading pending subscriptions" },
        { status: 500 }
      );
    }

    if (!pendingSubs || pendingSubs.length === 0) {
      return NextResponse.json(
        {
          error:
            "No pending memberships were found to pay for. If this is unexpected, please contact the club.",
        },
        { status: 400 }
      );
    }

    const subscriptionIds = pendingSubs.map((s) => s.id);
    const membershipYear =
      pendingSubs[0]?.membership_year ?? new Date().getFullYear();

    // Group by Stripe price so we don't send the same price multiple times
    type GroupedLineItem = {
      price: string;
      quantity: number;
      name?: string | null;
    };

    const grouped: Record<string, GroupedLineItem> = {};

    for (const sub of pendingSubs as any[]) {
      // Supabase nested `plan: membership_plans (...)` can come back as an array,
      // so normalise to a single row.
      const planArray = sub.plan as any;
      const planRow = Array.isArray(planArray) ? planArray[0] : planArray;

      const priceId: string | undefined =
        planRow?.stripe_price_id_annual ?? undefined;
      const planName: string | null = planRow?.name ?? null;

      if (!priceId) {
        return NextResponse.json(
          {
            error: `Membership plan "${
              planName ?? "Unknown"
            }" is not fully configured for Stripe. Missing stripe_price_id_annual.`,
          },
          { status: 400 }
        );
      }

      if (!grouped[priceId]) {
        grouped[priceId] = {
          price: priceId,
          quantity: 1,
          name: planName,
        };
      } else {
        grouped[priceId].quantity += 1;
      }
    }

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] =
      Object.values(grouped).map((item) => ({
        price: item.price,
        quantity: item.quantity,
      }));

    // Base URL for redirect
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const successUrl = `${baseUrl}/membership/thank-you?household=${householdId}`;
    const cancelUrl = `${baseUrl}/household/${householdId}?payment=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment", // one-off charges, requires one-time prices
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        household_id: householdId,
        club_id: clubId,
        membership_year: String(membershipYear),
        subscription_ids: JSON.stringify(subscriptionIds),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Unexpected error preparing membership payment. Please try again.",
      },
      { status: 500 }
    );
  }
}
