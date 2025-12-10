// app/admin/clubs/[clubId]/dashboard/DashboardClient.tsx
"use client";

import { useEffect, useState } from "react";

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

type Props = {
  clubId: string;
};

type StatCardProps = {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "default" | "highlight" | "subtle";
};

function StatCard({ label, value, helper, tone = "default" }: StatCardProps) {
  const toneClasses =
    tone === "highlight"
      ? "border-slate-900 bg-slate-900 text-white"
      : tone === "subtle"
      ? "border-slate-100 bg-slate-50 text-slate-900"
      : "border-slate-200 bg-white text-slate-900";

  return (
    <div
      className={`flex flex-col justify-between rounded-xl border ${toneClasses} p-4 shadow-sm`}
    >
    <div
      className={`text-xs font-medium uppercase tracking-wide ${
        tone === "highlight" ? "text-white/80" : "text-slate-700/80"
      }`}
    >
      {label}
    </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {value}
      </div>
      {helper && (
        <div
          className={`mt-2 text-xs ${
            tone === "highlight"
              ? "text-slate-200/90"
              : "text-slate-500"
          }`}
        >
          {helper}
        </div>
      )}
    </div>
  );
}

export default function DashboardClient({ clubId }: Props) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonYear] = useState<number>(2026); // matches other areas

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/clubs/${clubId}/stats?year=${seasonYear}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const msg =
            json?.error ??
            `Failed to load dashboard stats (status ${res.status})`;
          throw new Error(msg);
        }
        const json = (await res.json()) as StatsResponse;
        if (cancelled) return;
        setStats(json);
      } catch (err: any) {
        if (!cancelled) {
          console.error("Dashboard stats error", err);
          setError(err?.message ?? "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clubId, seasonYear]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 rounded bg-slate-200" />
        <div className="h-4 w-64 rounded bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-slate-100 bg-slate-50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Club overview
        </h1>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const { totals, bandCounts } = stats;

  const juniorsWithMedicalInfo =
    stats.juniors.filter((j) => j.medical_info === "yes").length;

  const juniorBands = Object.entries(bandCounts).sort(([a], [b]) =>
    a.localeCompare(b, "en-GB", { numeric: true }),
  );

  const totalGender = totals.male + totals.female + totals.other || 1;
  const malePct = Math.round((totals.male / totalGender) * 100);
  const femalePct = Math.round((totals.female / totalGender) * 100);
  const otherPct = 100 - malePct - femalePct;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">
          Club overview
        </h1>
        <p className="text-sm text-slate-600">
          Snapshot of registered members and junior pathway for the{" "}
          <span className="font-medium">{seasonYear}</span> season.
        </p>
      </header>

      {/* Top-level membership summary */}
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Total members"
          value={totals.totalMembers}
          helper="All active members registered at the club."
          tone="highlight"
        />
        <StatCard
          label="Playing members"
          value={totals.playingMembers}
          helper="Active members marked as players."
        />
        <StatCard
          label="Non-playing members"
          value={totals.nonPlayingMembers}
          helper="Parents, social members, officials and volunteers."
        />
        <StatCard
          label="Junior players"
          value={totals.juniors}
          helper="Playing members in junior age bands."
        />
      </section>

      {/* Gender + pathway / safeguarding row */}
      {/* Gender + pathway + safeguarding row */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* Gender & profile */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Member profile
            </h2>
            <span className="text-[11px] text-slate-500">
              Active members only
            </span>
          </div>

          <div className="space-y-3 text-sm">
            {/* Gender split bar */}
            <div>
              <div className="text-xs font-medium text-slate-500">
                Gender split
              </div>
              <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-sky-700"
                  style={{ width: `${malePct}%` }}
                />
                <div
                  className="h-full bg-pink-600"
                  style={{ width: `${femalePct}%` }}
                />
                <div
                  className="h-full bg-slate-400"
                  style={{ width: `${otherPct}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
                <span>
                  <span className="inline-block h-2 w-2 rounded-full bg-sky-700 align-middle" />{" "}
                  {totals.male} male
                </span>
                <span>
                  <span className="inline-block h-2 w-2 rounded-full bg-pink-600 align-middle" />{" "}
                  {totals.female} female
                </span>
                <span>
                  <span className="inline-block h-2 w-2 rounded-full bg-slate-400 align-middle" />{" "}
                  {totals.other} other / not stated
                </span>
              </div>
            </div>

            {/* Active vs inactive summary */}
            <div className="flex flex-wrap gap-4 text-[11px] text-slate-600">
              <span>
                <span className="font-semibold text-slate-900">
                  {totals.activeMembers}
                </span>{" "}
                active
              </span>
              <span>
                <span className="font-semibold text-slate-900">
                  {totals.inactiveMembers}
                </span>{" "}
                inactive (historic)
              </span>
            </div>
          </div>
        </div>

        {/* Pathway */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Pathway
            </h2>
            <span className="text-[11px] text-slate-500">
              Junior players only
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500">
                County
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {totals.countyPlayers}
              </div>
              <p className="text-xs text-slate-500">
                Junior players currently marked as county.
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500">
                District
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {totals.districtPlayers}
              </div>
              <p className="text-xs text-slate-500">
                Junior players in district or development squads.
              </p>
            </div>
          </div>
        </div>

        {/* Safeguarding */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Safeguarding
            </h2>
            <span className="text-[11px] text-slate-500">
              Junior players only
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500">
                No photo consent
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {totals.juniorsNoPhotoConsent}
              </div>
              <p className="text-xs text-slate-500">
                Juniors where photo consent is missing or recorded as “no”.
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500">
                Medical info
              </div>
              <div className="text-xl font-semibold text-slate-900">
                {juniorsWithMedicalInfo}
              </div>
              <p className="text-xs text-slate-500">
                Juniors with medical information recorded.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Use the juniors dashboard and member admin pages for individual
            player details. Sensitive safeguarding information is not shown
            here.
          </p>
        </div>
      </section>

      {/* Junior age bands */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Junior players by age band
          </h2>
          <span className="text-[11px] text-slate-500">
            Active junior players only
          </span>
        </div>

        {juniorBands.length === 0 ? (
          <p className="text-sm text-slate-600">
            No junior players recorded for this season yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {juniorBands.map(([band, count]) => (
              <div
                key={band}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="text-xs font-medium text-slate-500">
                  {band}
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-900">
                  {count}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-slate-900"
                    style={{
                      width: `${Math.min(100, 10 + count * 8)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
