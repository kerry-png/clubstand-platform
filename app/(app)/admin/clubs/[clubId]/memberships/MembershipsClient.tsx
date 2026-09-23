// app/(app)/admin/clubs/[clubId]/memberships/MembershipsClient.tsx

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type YesNoUnknown = "yes" | "no" | "unknown";

type MemberWithFlags = {
  id: string;
  household_id: string | null;
  first_name: string;
  last_name: string;
  member_type: string;
  status: string;
  age_band: string | null;
  is_junior: boolean;
  is_playing: boolean;
  has_active_membership: boolean;
  latest_membership_start: string | null;
  photo_consent: YesNoUnknown;
  medical_info: YesNoUnknown;
};

type StatsResponse = {
  seasonYear: number;
  members: MemberWithFlags[];
};

type Props = { clubId: string };

type ViewFilter = "noMembership" | "hasMembership";

export default function MembershipsClient({ clubId }: Props) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewFilter>("noMembership");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/clubs/${clubId}/stats`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Failed to load membership data");
        if (!cancelled) setStats(json as StatsResponse);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load membership data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const seasonYear = stats?.seasonYear ?? "—";

  // Junior playing members only (same intent as before, but now on the right page)
  const juniorsWithoutMembership = useMemo(() => {
    if (!stats) return [];
    return stats.members.filter(
      (m) =>
        m.is_junior &&
        m.is_playing &&
        m.status !== "inactive" &&
        !m.has_active_membership,
    );
  }, [stats]);

  const juniorsWithMembership = useMemo(() => {
    if (!stats) return [];
    return stats.members.filter(
      (m) =>
        m.is_junior &&
        m.is_playing &&
        m.status !== "inactive" &&
        m.has_active_membership,
    );
  }, [stats]);

  const currentList = view === "noMembership" ? juniorsWithoutMembership : juniorsWithMembership;

  const headerText =
    view === "noMembership"
      ? `Junior players without a membership recorded (Season ${seasonYear})`
      : `Junior players with a membership recorded (Season ${seasonYear})`;

  const subText =
    view === "noMembership"
      ? "These players do not currently have a membership recorded for this season. Payment may already have been received (including offline payments)."
      : "These players currently have a membership recorded for this season.";

  const emptyText =
    view === "noMembership"
      ? "All junior playing members currently have a membership recorded for this season."
      : "No junior playing members have a membership recorded for this season yet.";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Memberships
        </h1>
        <p className="text-sm text-slate-600">
          Membership entitlement and season checks. Payments are managed on the Payments page.
        </p>

        <div className="mt-3">
          <Link
            href={`/admin/clubs/${clubId}/payments`}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800"
          >
            Go to payments
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Season <span className="font-semibold">{seasonYear}</span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setView("noMembership")}
            className={`rounded-full border px-3 py-1 ${
              view === "noMembership"
                ? "border-amber-500 bg-amber-500 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            No membership recorded ({juniorsWithoutMembership.length})
          </button>

          <button
            type="button"
            onClick={() => setView("hasMembership")}
            className={`rounded-full border px-3 py-1 ${
              view === "hasMembership"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Membership recorded ({juniorsWithMembership.length})
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-600">Loading membership data…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{headerText}</h2>
              <p className="text-xs text-slate-600">{subText}</p>
            </div>
            <div className="text-xs font-semibold text-slate-900">
              {currentList.length} player{currentList.length === 1 ? "" : "s"}
            </div>
          </div>

          {currentList.length > 0 ? (
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Age band</th>
                    <th className="px-3 py-2">Member type</th>
                    <th className="px-3 py-2">Latest membership</th>
                  </tr>
                </thead>
                <tbody>
                  {currentList.map((m) => (
                    <tr key={m.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 align-top text-slate-950">
                        {m.first_name} {m.last_name}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-900">
                        {m.age_band ?? "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-900">
                        {m.member_type}
                      </td>
                      <td className="px-3 py-2 align-top text-slate-900">
                        {m.latest_membership_start
                          ? new Date(m.latest_membership_start).toLocaleDateString("en-GB", {
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
            <p className="mt-3 text-xs text-slate-700">{emptyText}</p>
          )}

          <p className="mt-3 text-[11px] text-slate-500">
            This view is membership entitlement only. It does not infer payment status.
          </p>
        </section>
      )}
    </div>
  );
}
