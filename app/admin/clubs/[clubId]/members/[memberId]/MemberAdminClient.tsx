// app/admin/clubs/[clubId]/members/[memberId]/MemberAdminClient.tsx

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
  memberId: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const ALLOWED_STATUSES = [
  "active",
  "inactive",
  "prospect",
  "lapsed",
  "banned",
] as const;

export default function MemberAdminClient({ clubId, memberId }: Props) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [member, setMember] = useState<MemberWithFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusSave, setStatusSave] = useState<SaveState>("idle");
  const [flagsSave, setFlagsSave] = useState<SaveState>("idle");

  // For now we hard-code 2026 to match the rest of the dashboards
  const [seasonYear] = useState<number>(2026);

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
            `Failed to load member stats (status ${res.status})`;
          throw new Error(msg);
        }

        const json = (await res.json()) as StatsResponse;

        if (cancelled) return;

        setStats(json);

        const allMembers = json.members ?? [];
        const found =
          allMembers.find((m) => m.id === memberId) ??
          json.juniors.find((m) => m.id === memberId) ??
          null;

        if (!found) {
          setError("Member not found in stats for this club.");
        } else {
          setMember(found);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("MemberAdminClient load error", err);
          setError(err?.message ?? "Failed to load member details");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [clubId, memberId, seasonYear]);

  const refreshFromStats = async () => {
    try {
      const res = await fetch(
        `/api/admin/clubs/${clubId}/stats?year=${seasonYear}`,
        { cache: "no-store" },
      );

      if (!res.ok) return;

      const json = (await res.json()) as StatsResponse;
      setStats(json);

      const allMembers = json.members ?? [];
      const found =
        allMembers.find((m) => m.id === memberId) ??
        json.juniors.find((m) => m.id === memberId) ??
        null;

      if (found) {
        setMember(found);
      }
    } catch (err) {
      console.error("Failed to refresh stats after update", err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!member) return;
    if (!ALLOWED_STATUSES.includes(newStatus as any)) return;

    setStatusSave("saving");
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/clubs/${clubId}/member-status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: member.id,
            status: newStatus,
          }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg =
          json?.error ?? `Failed to update status (status ${res.status})`;
        throw new Error(msg);
      }

      setMember((prev) =>
        prev ? { ...prev, status: newStatus } : prev,
      );
      setStatusSave("saved");
      await refreshFromStats();
    } catch (err: any) {
      console.error("Status update error", err);
      setError(err?.message ?? "Failed to update member status");
      setStatusSave("error");
    } finally {
      setTimeout(() => setStatusSave("idle"), 1500);
    }
  };

  const handleToggleFlag = async (flag: "county" | "district") => {
    if (!member) return;

    const isCounty = member.is_county_player;
    const isDistrict = member.is_district_player;

    let nextCounty = isCounty;
    let nextDistrict = isDistrict;

    if (flag === "county") {
      nextCounty = !isCounty;
      if (nextCounty) nextDistrict = false;
    } else {
      nextDistrict = !isDistrict;
      if (nextDistrict) nextCounty = false;
    }

    setFlagsSave("saving");
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/clubs/${clubId}/member-flags`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: member.id,
            is_county_player: nextCounty,
            is_district_player: nextDistrict,
          }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg =
          json?.error ??
          `Failed to update representative flags (status ${res.status})`;
        throw new Error(msg);
      }

      setMember((prev) =>
        prev
          ? {
              ...prev,
              is_county_player: nextCounty,
              is_district_player: nextDistrict,
            }
          : prev,
      );
      setFlagsSave("saved");
      await refreshFromStats();
    } catch (err: any) {
      console.error("Flag update error", err);
      setError(
        err?.message ?? "Failed to update county/district flags",
      );
      setFlagsSave("error");
    } finally {
      setTimeout(() => setFlagsSave("idle"), 1500);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const fullName =
    member &&
    `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim();

  const membershipSummary = (() => {
    if (!member) return "—";
    if (member.has_active_membership) {
      const started = formatDate(member.latest_membership_start);
      return started === "—"
        ? "Active membership"
        : `Active membership (since ${started})`;
    }
    return "No active membership on record";
  })();

  // TODO: wire this to real role/permission check
  const canViewPayments = true; // super admin + treasurer in future

  if (loading) {
    return (
      <div className="space-y-4">
        <a
          href={`/admin/clubs/${clubId}/juniors`}
          className="text-sm text-blue-700 hover:underline"
        >
          ← Back to juniors dashboard
        </a>
        <p className="text-sm text-slate-600">Loading member…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <a
          href={`/admin/clubs/${clubId}/juniors`}
          className="text-sm text-blue-700 hover:underline"
        >
          ← Back to juniors dashboard
        </a>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-4">
        <a
          href={`/admin/clubs/${clubId}/juniors`}
          className="text-sm text-blue-700 hover:underline"
        >
          ← Back to juniors dashboard
        </a>
        <p className="text-sm text-slate-600">
          Member not found for this club.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <a
        href={`/admin/clubs/${clubId}/juniors`}
        className="text-sm text-blue-700 hover:underline"
      >
        ← Back to juniors dashboard
      </a>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          {fullName || "Unnamed member"}
        </h1>
        <p className="text-sm text-slate-600">
          {member.age_band
            ? `${member.age_band} • ${member.gender ?? "—"} • ${
                member.member_type
              }`
            : `${member.gender ?? "—"} • ${member.member_type}`}
        </p>
        <p className="text-xs text-slate-500">
          DOB: {formatDate(member.date_of_birth)}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Membership + status */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Membership & status
          </h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Member status
              </div>
              <div className="mt-1 flex items-center gap-2">
                <select
                  value={member.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                >
                  {ALLOWED_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
                {statusSave === "saving" && (
                  <span className="text-xs text-slate-500">Saving…</span>
                )}
                {statusSave === "saved" && (
                  <span className="text-xs text-green-600">Saved</span>
                )}
                {statusSave === "error" && (
                  <span className="text-xs text-red-600">Error</span>
                )}
              </div>
            </div>

            {canViewPayments && (
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Payment / subscription
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {membershipSummary}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  (Detailed payment view to come – this section is for
                  super admins & treasurers.)
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Pathway & safeguarding */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Pathway & safeguarding
          </h2>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="text-xs font-medium text-slate-500">
                Representative cricket
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleFlag("county")}
                  className={[
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                    member.is_county_player
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300",
                  ].join(" ")}
                >
                  County
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleFlag("district")}
                  className={[
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                    member.is_district_player
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white text-slate-700 border-slate-300",
                  ].join(" ")}
                >
                  District
                </button>
                {flagsSave === "saving" && (
                  <span className="text-xs text-slate-500">Saving…</span>
                )}
                {flagsSave === "saved" && (
                  <span className="text-xs text-green-600">Saved</span>
                )}
                {flagsSave === "error" && (
                  <span className="text-xs text-red-600">Error</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">
                Photo consent
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {member.photo_consent === "yes"
                  ? "Yes"
                  : member.photo_consent === "no"
                  ? "No – do not use this child in photos"
                  : "Unknown / not answered"}
              </p>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">
                Medical info
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {member.medical_info === "yes"
                  ? "Medical information recorded"
                  : member.medical_info === "no"
                  ? "No medical information recorded"
                  : "Unknown / not answered"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
