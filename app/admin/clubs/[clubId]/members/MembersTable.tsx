// app/admin/clubs/[clubId]/members/MembersTable.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type MemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  member_type: string; // player / guardian / etc.
  status: string;      // active / prospect / lapsed / etc.
  date_of_birth: string | null;
  is_county_player: boolean;
  is_district_player: boolean;
};

type Props = {
  members: MemberRow[];
  clubId: string;
};

type PlayingFilter = "all" | "playing" | "nonPlaying";

export default function MembersTable({ members, clubId }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [playingFilter, setPlayingFilter] =
    useState<PlayingFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return members.filter((m) => {
      // Playing vs non-playing
      const isPlaying = m.member_type === "player";

      if (playingFilter === "playing" && !isPlaying) return false;
      if (playingFilter === "nonPlaying" && isPlaying) return false;

      // Status filter
      if (statusFilter !== "all" && m.status !== statusFilter) {
        return false;
      }

      // Text search by name
      if (q) {
        const fullName = `${m.first_name} ${m.last_name}`
          .toLowerCase()
          .trim();
        if (!fullName.includes(q)) return false;
      }

      return true;
    });
  }, [members, search, statusFilter, playingFilter]);

  const formatType = (m: MemberRow) => {
    if (m.member_type === "player") return "Playing";
    if (m.member_type === "guardian") return "Guardian";
    if (m.member_type === "official") return "Official";
    if (m.member_type === "social") return "Social";
    return m.member_type;
  };

  const formatStatus = (status: string) => {
    return status[0]?.toUpperCase() + status.slice(1);
  };

  const statusOptions = Array.from(
    new Set(members.map((m) => m.status)),
  ).sort();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Playing / non-playing filter */}
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setPlayingFilter("all")}
              className={`px-3 py-1 rounded-full ${
                playingFilter === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setPlayingFilter("playing")}
              className={`px-3 py-1 rounded-full ${
                playingFilter === "playing"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Playing
            </button>
            <button
              type="button"
              onClick={() => setPlayingFilter("nonPlaying")}
              className={`px-3 py-1 rounded-full ${
                playingFilter === "nonPlaying"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Non-playing
            </button>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
          >
            <option value="all">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>
        </div>

        {/* Search box */}
        <div>
          <input
            type="text"
            placeholder="Search members by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded-md border border-slate-200 bg-white px-3 text-xs shadow-sm sm:w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Gender</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Rep</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-xs text-slate-500"
                >
                  No members match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const isPlaying = m.member_type === "player";

                return (
                  <tr
                    key={m.id}
                    className="border-t border-slate-100 hover:bg-slate-50/70"
                  >
                    {/* Name */}
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-900">
                          {m.first_name} {m.last_name}
                        </span>
                      </div>
                    </td>

                    {/* Type (playing / guardian / etc.) */}
                    <td className="px-3 py-2 align-middle">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-[2px] text-[11px] ${
                          isPlaying
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-slate-50 text-slate-700 border border-slate-100"
                        }`}
                      >
                        {formatType(m)}
                      </span>
                    </td>

                    {/* Gender */}
                    <td className="px-3 py-2 align-middle text-slate-700">
                      {m.gender ?? "—"}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 align-middle">
                      <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-[2px] text-[11px] text-slate-700">
                        {formatStatus(m.status)}
                      </span>
                    </td>

                    {/* Rep flags */}
                    <td className="px-3 py-2 align-middle">
                      {m.is_county_player && (
                        <span className="mr-1 inline-flex items-center rounded-full bg-purple-50 px-2 py-[2px] text-[11px] text-purple-700">
                          County
                        </span>
                      )}
                      {m.is_district_player && (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] text-indigo-700">
                          District
                        </span>
                      )}
                      {!m.is_county_player &&
                        !m.is_district_player && (
                          <span className="text-[11px] text-slate-400">
                            —
                          </span>
                        )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 align-middle text-right">
                      <Link
                        href={`/admin/clubs/${clubId}/members/${m.id}`}
                        className="text-[11px] font-medium text-blue-700 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
