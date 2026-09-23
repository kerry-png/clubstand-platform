// app/(app)/admin/clubs/[clubId]/payments/PaymentsClient.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RecordOfflinePaymentModal from "@/components/admin/RecordOfflinePaymentModal";

type StripeStatus = {
  connected: boolean;
  status: "not_connected" | "pending" | "connected" | "restricted" | string;
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
};

type HouseholdOption = {
  id: string;
  name: string | null;
  primary_email: string | null;
  secondary_email: string | null;
};

type OfflinePaymentRow = {
  id: string;
  household_id: string;
  member_id: string | null;
  amount_pennies: number;
  currency: string;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_on: string;
  created_at: string;
  household: {
    id: string;
    name: string | null;
    primary_email: string | null;
  } | null;
  member: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
};

type PaymentsClientProps = {
  clubId: string;
};

type MonthsFilter = 2 | 3 | 6 | 12 | "all";

export default function PaymentsClient({ clubId }: PaymentsClientProps) {
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);

  // Offline payments
  const [offlinePayments, setOfflinePayments] = useState<OfflinePaymentRow[]>([]);
  const [offlinePaymentsTotal, setOfflinePaymentsTotal] = useState<number>(0);
  const [households, setHouseholds] = useState<HouseholdOption[]>([]);
  const [membersByHousehold, setMembersByHousehold] = useState<Record<string, any[]>>({});
  const [offlineLoading, setOfflineLoading] = useState(true);
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [canEditOffline, setCanEditOffline] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [months, setMonths] = useState<MonthsFilter>(3);

  useEffect(() => {
    let cancelled = false;

    async function loadStripe() {
      setStripeLoading(true);
      try {
        const res = await fetch(`/api/admin/clubs/${clubId}/stripe/status`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Failed to load Stripe status");
        if (!cancelled) setStripeStatus(json as StripeStatus);
      } catch {
        if (!cancelled) setStripeStatus(null);
      } finally {
        if (!cancelled) setStripeLoading(false);
      }
    }

    loadStripe();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  async function loadOfflinePayments(nextMonths: MonthsFilter = months) {
    setOfflineLoading(true);
    setOfflineError(null);
    try {
      const res = await fetch(
        `/api/admin/clubs/${clubId}/offline-payments?months=${nextMonths}`,
        { cache: "no-store" },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to load offline payments");

      setOfflinePayments((json?.offlinePayments ?? []) as OfflinePaymentRow[]);
      setOfflinePaymentsTotal(Number(json?.offlinePaymentsTotal ?? 0));
      setHouseholds((json?.households ?? []) as HouseholdOption[]);
      setMembersByHousehold((json?.membersByHousehold ?? {}) as Record<string, any[]>);
      setCanEditOffline(Boolean(json?.canEdit));
    } catch (e: any) {
      console.error("Offline payments load error", e);
      setOfflineError(e?.message ?? "Failed to load offline payments");
    } finally {
      setOfflineLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadOfflinePayments(months);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, months]);

  const stripeBadge =
    stripeStatus?.status === "connected"
      ? { text: "Connected", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" }
      : stripeStatus?.status === "pending"
      ? { text: "Onboarding", cls: "bg-amber-100 text-amber-900 border-amber-200" }
      : stripeStatus?.status === "restricted"
      ? { text: "Action required", cls: "bg-red-100 text-red-800 border-red-200" }
      : { text: "Not connected", cls: "bg-slate-100 text-slate-800 border-slate-200" };

  function formatMoneyPennies(pennies: number, currency: string) {
    const pounds = pennies / 100;
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: (currency || "GBP").toUpperCase(),
    }).format(pounds);
  }

  function methodLabel(method: string) {
    const m = (method || "").toLowerCase();
    if (m === "bacs") return "BACS";
    if (m === "cash") return "Cash";
    if (m === "cheque") return "Cheque";
    return method;
  }

  const shownCount = offlinePayments.length;

  const monthsLabel = useMemo(() => {
    if (months === "all") return "All time";
    return `Last ${months} months`;
  }, [months]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Payments
        </h1>
        <p className="text-sm text-slate-600">
          Manage Stripe connection and record offline payments (cash/BACS/cheque).
        </p>
      </header>

      {/* Stripe connection card */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Stripe connection</h2>
            <p className="mt-1 text-xs text-slate-600">
              Each club needs their own Stripe account connected before taking payments.
            </p>
          </div>

          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${stripeBadge.cls}`}>
            {stripeLoading ? "Checking…" : stripeBadge.text}
          </span>
        </div>

        {stripeLoading ? (
          <p className="mt-2 text-xs text-slate-600">Loading Stripe status…</p>
        ) : stripeStatus?.status !== "connected" ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            This club can’t take payments until Stripe onboarding is completed.
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/admin/clubs/${clubId}/payments/stripe`}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
          >
            Manage Stripe connection
          </Link>

          <Link
            href={`/admin/clubs/${clubId}/memberships`}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
          >
            Go to memberships
          </Link>
        </div>
      </section>

      {/* Offline payments ledger */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Offline payments</h2>
            <p className="mt-1 text-xs text-slate-600">
              Record cash, BACS and cheque payments here. This does not change Stripe subscriptions.
            </p>

            <p className="mt-2 text-[11px] text-slate-500">
              {monthsLabel} — showing {shownCount} of {offlinePaymentsTotal}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
              value={months}
              onChange={(e) => setMonths((e.target.value as any) as MonthsFilter)}
            >
              <option value="2">Last 2 months</option>
              <option value="3">Last 3 months</option>
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
              <option value="all">All time</option>
            </select>

            <button
              type="button"
              onClick={() => loadOfflinePayments(months)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
            >
              Refresh
            </button>

            {months !== "all" && (
              <button
                type="button"
                onClick={() => setMonths("all")}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
              >
                View all
              </button>
            )}

            {canEditOffline && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Record offline payment
              </button>
            )}
          </div>
        </div>

        {offlineLoading ? (
          <p className="mt-3 text-xs text-slate-600">Loading offline payments…</p>
        ) : offlineError ? (
          <p className="mt-3 text-xs text-red-600">{offlineError}</p>
        ) : offlinePayments.length === 0 ? (
          <p className="mt-3 text-xs text-slate-600">
            No offline payments recorded in this period.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-700">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Household</th>
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {offlinePayments.map((p) => {
                  const householdName =
                    p.household?.name ??
                    p.household?.primary_email ??
                    "Household";

                  const memberName = p.member
                    ? `${p.member.first_name} ${p.member.last_name}`
                    : "—";

                  return (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 align-top text-slate-900">
                        {new Date(p.paid_on).toLocaleDateString("en-GB", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Link
                          href={`/household/${p.household_id}`}
                          className="text-slate-900 underline decoration-slate-300 hover:decoration-slate-600"
                        >
                          {householdName}
                        </Link>
                      </td>
                      <td className="px-3 py-2 align-top text-slate-900">
                        {memberName}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-900">
                        {methodLabel(p.method)}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-900">
                        {formatMoneyPennies(p.amount_pennies, p.currency)}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        {p.reference ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-700">
                        {p.notes ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!canEditOffline && (
          <p className="mt-3 text-[11px] text-slate-500">
            You can view offline payments, but you don’t have permission to record them.
          </p>
        )}
      </section>

      <RecordOfflinePaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        clubId={clubId}
        households={households}
        membersByHousehold={membersByHousehold}
        onSaved={() => loadOfflinePayments(months)}
      />

      {/* Stripe payments/subscriptions placeholder */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Stripe payments (coming soon)
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          This section will show live Stripe payments, failed collections and upcoming renewals once the endpoint is wired up.
        </p>
      </section>
    </div>
  );
}
