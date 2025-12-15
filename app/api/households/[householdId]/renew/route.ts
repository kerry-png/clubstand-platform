// app/api/households/[householdId]/renew/route.ts

import { NextResponse } from "next/server";

type RouteParams = { householdId: string };

export async function POST(
  _req: Request,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
) {
  const rawParams: any = (context as any).params;
  const resolvedParams: RouteParams = rawParams?.then ? await rawParams : rawParams;

  const householdId = resolvedParams?.householdId;

  return NextResponse.json(
    {
      error: "Renewals endpoint not enabled yet",
      details:
        "We are completing the rules-based pricing + connected Stripe checkout flow first. Renewal logic will be reintroduced once the full join/checkout run is verified.",
      householdId: householdId ?? null,
    },
    { status: 501 },
  );
}
