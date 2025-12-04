//app/admin/clubs/[clubId]/layout.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type JuniorRow = {
  id: string;
  name: string;
  gender: string | null;
  age: number | null;
  ageBand: string | null;
  is_county_player: boolean;
  is_district_player: boolean;
  photoConsent: boolean | null;
  medicalInfo: boolean; // NEW
};

type StatsResponse = {
  totals: {
    totalActive: number;
    male: number;
    female: number;
    juniorMale: number;
    juniorFemale: number;
    countyPlayers: number;
    districtPlayers: number;
    noPhotoConsent: number;
  };
  ageBands: Record<string, number>;
  juniors: JuniorRow[];
};

type FilterKey = "male" | "female" | "county" | "district" | "noPhoto";

export default function JuniorsDashboardClient({
  clubId,
}: {
  clubId: string;
}) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [genderFilters, setGenderFilters] = useState<Set<string>>(
    () => new Set(),
  );
  const [ageBandFilters, setAgeBandFilters] = useState<Set<string>>(
    () => new Set(),
  );
  const [flagFilters, setFlagFilters] = useState<Set<FilterKey>>(
    () => new Set(),
  );

  const [savingFlag, setSavingFlag] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/admin/clubs/${clubId}/stats`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      setLoading(false);
    }
    load();
  }, [clubId]);

  const toggleGender = (g: "male" | "female") => {
    setGenderFilters((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const toggleBand = (band: string) => {
    setAgeBandFilters((prev) => {
      const next = new Set(prev);
      if (next.has(band)) next.delete(band);
      else next.add(band);
      return next;
    });
  };

  const toggleFlagFilter = (f: FilterKey) => {
    setFlagFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const clearFilters = () => {
    setGenderFilters(new Set());
    setAgeBandFilters(new Set());
    setFlagFilters(new Set());
  };

  const filteredJuniors = useMemo(() => {
    if (!data) return [];

    return data.juniors.filter((j) => {
      // gender
      if (
        genderFilters.size > 0 &&
        (!j.gender || !genderFilters.has(j.gender))
      ) {
        return false;
      }

      // age band
      if (
        ageBandFilters.size > 0 &&
        (!j.ageBand || !ageBandFilters.has(j.ageBand))
      ) {
        return false;
      }

      // flags
      if (flagFilters.has("county") && !j.is_county_player) return false;
      if (flagFilters.has("district") && !j.is_district_player) return false;
      if (
        flagFilters.has("noPhoto") &&
        j.photoConsent === true // only show those without positive consent
      ) {
        return false;
      }

      return true;
    });
  }, [data, genderFilters, ageBandFilters, flagFilters]);

  async function updateFlagsForJunior(
    junior: JuniorRow,
    mode: "county" | "district",
    checked: boolean,
  ) {
    // Enforce: County OR District, not both.
    // If we tick County: set county = true, district = false.
    // If we untick County: set county = false, district stays false.
    // Same for District in reverse.

    const nextCounty =
      mode === "county" ? checked : checked ? false : junior.is_county_player;
    const nextDistrict =
      mode === "district"
        ? checked
        : checked
        ? false
        : junior.is_district_player;

    setSavingFlag(`${junior.id}:${mode}`);

    await fetch(`/api/admin/clubs/${clubId}/member-flags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: junior.id,
        is_county_player: nextCounty,
        is_district_player: nextDistrict,
      }),
    });

    setSavingFlag(null);

    // Reload stats so UI stays in sync
    const res = await fetch(`/api/admin/clubs/${clubId}/stats`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
  }

  if (loading || !data) {
    return <p className="text-sm text-slate-600">Loading juniors…</p>;
  }

  const t = data.totals;

  const bandOrder = [
    "U9",
    "U10",
    "U11",
    "U12",
    "U13",
    "U14",
    "U15",
    "U16",
    "U17",
    "U18",
  ];
  const orderedBands = bandOrder.filter((b) => b in data.ageBands);

  const hasAnyFilter =
    genderFilters.size > 0 ||
    ageBandFilters.size > 0 ||
    flagFilters.size > 0;

  return (
    <div className="space-y-6">
      {/* FILTERABLE SUMMARY CARDS */}
      <div className="flex flex-wrap gap-3">
        <FilterCard
          label="Boys"
          value={t.juniorMale}
          active={genderFilters.has("male")}
          onClick={() => toggleGender("male")}
        />
        <FilterCard
          label="Girls"
          value={t.juniorFemale}
          active={genderFilters.has("female")}
          onClick={() => toggleGender("female")}
        />
        <FilterCard
          label="County players"
          value={t.countyPlayers}
          active={flagFilters.has("county")}
          onClick={() => toggleFlagFilter("county")}
        />
        <FilterCard
          label="District players"
          value={t.districtPlayers}
          active={flagFilters.has("district")}
          onClick={() => toggleFlagFilter("district")}
        />
        <FilterCard
          label="No photo consent"
          value={t.noPhotoConsent}
          active={flagFilters.has("noPhoto")}
          warn
          onClick={() => toggleFlagFilter("noPhoto")}
        />
      </div>

      {/* AGE BAND FILTERS */}
      <div>
        <h2 className="text-sm font-semibold mb-2">Filter by age band</h2>
        <div className="flex flex-wrap gap-2">
          {orderedBands.map((band) => (
            <button
              key={band}
              type="button"
              onClick={() => toggleBand(band)}
              className={`rounded px-3 py-2 text-xs border transition ${
                ageBandFilters.has(band)
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-800"
              }`}
            >
              <div className="font-semibold">{band}</div>
              <div className="text-[10px] text-slate-600">
                {data.ageBands[band]} juniors
              </div>
            </button>
          ))}
        </div>
      </div>

      {hasAnyFilter && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-xs underline text-slate-600"
        >
          Clear filters
        </button>
      )}

      {/* JUNIORS TABLE */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Juniors ({filteredJuniors.length})
        </h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm border-separate border-spacing-y-2">
            <thead>
              <tr className="text-left text-xs text-slate-700">
                <th className="px-3 py-1">Name</th>
                <th className="px-3 py-1">Gender</th>
                <th className="px-3 py-1">Age</th>
                <th className="px-3 py-1">Band</th>
                <th className="px-3 py-1">County</th>
                <th className="px-3 py-1">District</th>
                <th className="px-3 py-1">Photo consent</th>
                <th className="px-3 py-1">Medical info</th>
              </tr>
            </thead>
            <tbody>
              {filteredJuniors.map((j) => {
                const noConsent = j.photoConsent !== true;
                const savingCounty = savingFlag === `${j.id}:county`;
                const savingDistrict = savingFlag === `${j.id}:district`;

                return (
                  <tr
                    key={j.id}
                    className={`bg-white border rounded ${
                      noConsent
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200"
                    }`}
                  >
                    <td className="px-3 py-2">{j.name}</td>
                    <td className="px-3 py-2">{j.gender ?? "-"}</td>
                    <td className="px-3 py-2">{j.age ?? "-"}</td>
                    <td className="px-3 py-2">{j.ageBand ?? "-"}</td>

                    {/* COUNTY – editable, mutually exclusive with district */}
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={j.is_county_player}
                        disabled={savingCounty || savingDistrict}
                        onChange={(e) =>
                          updateFlagsForJunior(j, "county", e.target.checked)
                        }
                      />
                    </td>

                    {/* DISTRICT – editable, mutually exclusive with county */}
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={j.is_district_player}
                        disabled={savingCounty || savingDistrict}
                        onChange={(e) =>
                          updateFlagsForJunior(j, "district", e.target.checked)
                        }
                      />
                    </td>

                    {/* PHOTO CONSENT */}
                    <td className="px-3 py-2">
                      {j.photoConsent === true ? (
                        <span className="text-green-700 text-xs">Yes</span>
                      ) : j.photoConsent === false ? (
                        <span className="text-red-700 font-semibold text-xs">
                          No
                        </span>
                      ) : (
                        <span className="text-red-700 font-semibold text-xs">
                          Not answered
                        </span>
                      )}
                    </td>

                    {/* MEDICAL INFO */}
                    <td className="px-3 py-2">
                      {j.medicalInfo ? (
                        <span className="text-green-700 text-xs">
                          On file
                        </span>
                      ) : (
                        <span className="text-red-700 font-semibold text-xs">
                          Missing
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterCard({
  label,
  value,
  active,
  warn,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  warn?: boolean;
  onClick: () => void;
}) {
  const base = warn ? "border-red-300 bg-red-50" : "border-slate-200 bg-white";
  const activeClass = warn
    ? "border-red-600 bg-red-600 text-white"
    : "border-slate-900 bg-slate-900 text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-3 border text-left text-xs transition ${
        active ? activeClass : base
      }`}
    >
      <div className="text-[11px]">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </button>
  );
}
