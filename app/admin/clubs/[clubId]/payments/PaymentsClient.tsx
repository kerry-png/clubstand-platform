// app/admin/clubs/[clubId]/payments/PaymentsClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type YesNoUnknown = "yes" | "no" | "unknown";

type MemberWithFlags = {
  id: string;
  household_id: string | null;
  first_name: string;
  last_name: string;
  gender: string | null;
  date_of_birth: string | null;
  member_type: string;
  status: string;
  is_county_player: boolean;
  is_district_player: boolean;
  age_on_1_september: number | null;
  age_band: string | null;
  is_junior: boolean;
  is_playing: boolean;
  photo_consent: YesNoUnknown;
  medical_info: YesNoUnknown;
  has_active_membership: boolean;
  latest_membership_start: string | null;
};

type StatsResponse = {
  seasonYear: number;
  totals: {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    playingMembers: number;
    nonPlayingMembers: number;
    male: number;
    female: number;
    other: number;
    juniors: number;
    juniorsMale: number;
    juniorsFemale: number;
    countyPlayers: number;
    districtPlayers: number;
    juniorsNoPhotoConsent: number;
  };
  bandCounts: Record<string, number>;
  members: MemberWithFlags[];
  juniors: MemberWithFlags[];
};

type PaymentsClientProps = {
  clubId: string;
};

type ViewFilter = "awaiting" | "paid";

export default function PaymentsClient({ clubId }: PaymentsClientProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewFilter>("awaiting");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/clubs/${clubId}/stats`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const msg =
            json?.error ??
            `Failed to load membership stats (status ${res.status})`;
          throw new Error(msg);
        }
        const json = (await res.json()) as StatsResponse;
        if (!cancelled) setStats(json);
      } catch (err: any) {
        if (!cancelled) {
          console.error("PaymentsClient stats error", err);
          setError(err?.message ?? "Failed to load membership stats");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const seasonYear = stats?.seasonYear;

  // Juniors who are playing, not inactive, and have / don't have active membership
  const juniorsAwaiting = useMemo(() => {
    if (!stats) return [];
    return stats.members.filter(
      (m) =>
        m.is_junior &&
        m.is_playing &&
        m.status !== "inactive" &&
        !m.has_active_membership,
    );
  }, [stats]);

  const juniorsPaid = useMemo(() => {
    if (!stats) return [];
    return stats.members.filter(
      (m) =>
        m.is_junior &&
        m.is_playing &&
        m.status !== "inactive" &&
        m.has_active_membership,
    );
  }, [stats]);

  const currentList = view === "awaiting" ? juniorsAwaiting : juniorsPaid;

  const panelClasses =
    view === "awaiting"
      ? "border-amber-100 bg-amber-50"
      : "border-emerald-100 bg-emerald-50";

  const headerText =
    view === "awaiting"
      ? "Junior playing members awaiting membership payment"
      : "Junior playing members with active membership";

  const subText =
    view === "awaiting"
      ? "Players marked as active but without an active membership recorded for this season."
      : "Players marked as active with an active membership recorded for this season.";

  const emptyText =
    view === "awaiting"
      ? "All junior playing members currently have an active membership recorded for this season."
      : "No junior playing members are marked as fully paid up yet.";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Payments &amp; junior memberships
        </h1>
        <p className="text-sm text-slate-600">
          From January onwards, use this page to see which junior players have
          paid for the new season and who is still awaiting payment.
        </p>
      </header>

      {/* Season + toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Season{" "}
          <span className="font-semibold">
            {seasonYear ?? "—"}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setView("awaiting")}
            className={`rounded-full border px-3 py-1 ${
              view === "awaiting"
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Awaiting payment ({juniorsAwaiting.length})
          </button>
          <button
            type="button"
            onClick={() => setView("paid")}
            className={`rounded-full border px-3 py-1 ${
              view === "paid"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Paid up ({juniorsPaid.length})
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-slate-600">
          Loading membership data…
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && (
        <>
          {/* Main junior membership panel */}
          <section
            className={`rounded-xl border p-4 text-sm ${panelClasses}`}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {headerText}
                </h2>
                <p className="text-xs text-slate-700">{subText}</p>
              </div>
              <div className="text-xs font-semibold text-slate-900">
                {currentList.length} player
                {currentList.length === 1 ? "" : "s"}
              </div>
            </div>

            {currentList.length > 0 ? (
              <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white/80">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Age band</th>
                      <th className="px-3 py-2">Member type</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Latest membership</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentList.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-3 py-2 align-top text-slate-950">
                          {m.first_name} {m.last_name}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-900">
                          {m.age_band ?? "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-900">
                          {m.member_type}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-900 capitalize">
                          {m.status}
                        </td>
                        <td className="px-3 py-2 align-top text-slate-900">
                          {m.latest_membership_start
                            ? new Date(
                                m.latest_membership_start,
                              ).toLocaleDateString("en-GB", {
                                year: "numeric",
                                month: "short",
                                day: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-800">
                {emptyText}
              </p>
            )}

            <p className="mt-3 text-[11px] text-slate-700">
              This view only includes junior players marked as active. Use the
              member admin pages for full details on households, contact
              details and individual payment histories.
            </p>
          </section>

          {/* Placeholder for future Stripe / subs table */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Stripe subscriptions (coming soon)
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This section will show live Stripe subscriptions, failed
              collections and upcoming renewals once the payments endpoint is
              wired up.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              For now, use this junior membership view as a quick check during
              January–April to see who has paid and who still needs setting up
              on a plan.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
