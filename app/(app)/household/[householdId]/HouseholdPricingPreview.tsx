// app/household/[householdId]/HouseholdPricingPreview.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  householdId: string;
};

type AppliedRule = {
  ruleId: string;
  ruleType: "bundle" | "multi_member_discount" | "household_cap";
  amountPennies: number;
};

type PricingApiResponse = {
  success: boolean;
  householdId: string;
  seasonYear: number;
  clubId: string | null;

  baseTotalPennies: number;
  finalTotalPennies: number;
  adjustmentPennies: number;
  applied: AppliedRule[];

  subscriptions: any[];
};

function formatPounds(pennies: number | undefined | null): string {
  if (pennies == null) return "£0";
  const value = pennies / 100;
  const formatted = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `£${formatted}`;
}

function formatSigned(pennies: number): string {
  const sign = pennies < 0 ? "−" : "+";
  return `${sign}${formatPounds(Math.abs(pennies))}`;
}

function labelRuleType(t: AppliedRule["ruleType"]) {
  switch (t) {
    case "bundle":
      return "Bundle";
    case "multi_member_discount":
      return "Multi-member discount";
    case "household_cap":
      return "Household cap";
    default:
      return t;
  }
}

export default function HouseholdPricingPreview({ householdId }: Props) {
  const [data, setData] = useState<PricingApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPricing() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/households/${householdId}/pricing?seasonYear=2026&refresh=${refreshKey}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
          },
        );

        if (!res.ok) {
          const text = await res.text();
          if (!cancelled) {
            setError(
              `Failed to load pricing (${res.status}). ${text || "Please try again."}`,
            );
          }
          return;
        }

        const json = (await res.json()) as PricingApiResponse;

        if (cancelled) return;

        if (!json?.success) {
          setError("No pricing data returned for this household.");
          setData(null);
          return;
        }

        setData(json);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Unexpected error while loading pricing data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPricing();

    return () => {
      cancelled = true;
    };
  }, [householdId, refreshKey]);

  const handleRecalculate = () => setRefreshKey((k) => k + 1);

  if (loading && !data && !error) {
    return (
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        Calculating your 2026 membership based on everyone in this household…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-2">
        <div className="font-semibold">Membership pricing preview</div>
        <div>{error}</div>
        <button
          type="button"
          onClick={handleRecalculate}
          className="mt-1 inline-flex items-center rounded border border-red-300 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        No pricing could be calculated yet. Make sure everyone who needs a
        membership is added to this household.
      </div>
    );
  }

  const { seasonYear, baseTotalPennies, finalTotalPennies, applied } = data;

  return (
    <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">Membership preview (season {seasonYear})</div>
        <button
          type="button"
          onClick={handleRecalculate}
          className="inline-flex items-center rounded border border-emerald-300 bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50"
        >
          Recalculate pricing
        </button>
      </div>

      <p>
        Total before rules:{" "}
        <span className="font-semibold">{formatPounds(baseTotalPennies)}</span>
        {" · "}
        Total after rules:{" "}
        <span className="font-semibold">{formatPounds(finalTotalPennies)}</span>
      </p>

      {applied?.length > 0 ? (
        <div className="space-y-1">
          <div className="font-medium">Applied rules</div>
          <ul className="list-disc pl-5 space-y-1">
            {applied.map((a) => (
              <li key={`${a.ruleType}-${a.ruleId}`}>
                {labelRuleType(a.ruleType)}:{" "}
                <span className="font-semibold">{formatSigned(a.amountPennies)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] text-emerald-800/80">
          No pricing rules applied (standard pricing).
        </p>
      )}

      <p className="text-[11px] text-emerald-800/80">
        This is a preview only. Your actual membership subscriptions are created when you complete payment.
      </p>
    </div>
  );
}
