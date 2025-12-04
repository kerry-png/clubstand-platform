// app/admin/clubs/[clubId]/juniors/JuniorsDashboardClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type YesNoUnknown = 'yes' | 'no' | 'unknown';

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
};

type JuniorFilterKey =
  | 'male'
  | 'female'
  | 'county'
  | 'district'
  | 'noPhotoConsent'
  | 'band:U9'
  | 'band:U10'
  | 'band:U11'
  | 'band:U12'
  | 'band:U13'
  | 'band:U14'
  | 'band:U15'
  | 'band:U16'
  | 'band:U17'
  | 'band:U18';

export default function JuniorsDashboardClient({ clubId }: Props) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonYear] = useState<number>(2026);
  const [filters, setFilters] = useState<
    Record<JuniorFilterKey, boolean>
  >({
    male: false,
    female: false,
    county: false,
    district: false,
    noPhotoConsent: false,
    'band:U9': false,
    'band:U10': false,
    'band:U11': false,
    'band:U12': false,
    'band:U13': false,
    'band:U14': false,
    'band:U15': false,
    'band:U16': false,
    'band:U17': false,
    'band:U18': false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        console.log('JuniorsDashboardClient loading', { clubId, seasonYear });

        const res = await fetch(
          `/api/admin/clubs/${clubId}/stats?year=${seasonYear}`,
          { cache: 'no-store' },
        );

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const msg =
            json?.error ??
            `Failed to load juniors stats (status ${res.status})`;
          throw new Error(msg);
        }

        const json = (await res.json()) as StatsResponse;

        if (!cancelled) {
          setData(json);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('JuniorsDashboardClient load error', err);
          setError(
            err?.message ?? 'Failed to load juniors stats',
          );
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
  }, [clubId, seasonYear]);


  function toggleFilter(key: JuniorFilterKey) {
    setFilters((prev: Record<JuniorFilterKey, boolean>) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const bandOrder = [
    'U9',
    'U10',
    'U11',
    'U12',
    'U13',
    'U14',
    'U15',
    'U16',
    'U17',
    'U18',
  ];

  const juniors = data?.juniors ?? [];

  const filteredJuniors = useMemo(() => {
    const genderSelected =
      filters.male || filters.female;
    const bandSelected = bandOrder.some(
      (b) => filters[`band:${b}` as JuniorFilterKey],
    );

    return juniors.filter((j) => {
      if (!j.is_junior) return false;

      if (genderSelected) {
        const g = (j.gender ?? '').toLowerCase();
        const maleOn = filters.male;
        const femaleOn = filters.female;

        if (maleOn && !femaleOn && g !== 'male') return false;
        if (femaleOn && !maleOn && g !== 'female') return false;
        if (maleOn && femaleOn && g !== 'male' && g !== 'female') {
          return false;
        }
      }

      if (filters.county && !j.is_county_player) return false;
      if (filters.district && !j.is_district_player) return false;

      if (
        filters.noPhotoConsent &&
        j.photo_consent !== 'no'
      ) {
        return false;
      }

      if (bandSelected) {
        const band = j.age_band;
        if (!band) return false;
        const key = `band:${band}` as JuniorFilterKey;
        if (!filters[key]) return false;
      }

      return true;
    });
  }, [juniors, filters, bandOrder]);

  if (loading) {
    return (
      <p className="text-sm text-slate-600">
        Loading juniors…
      </p>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-slate-600">
        No stats available for this club yet.
      </p>
    );
  }

  const bandCounts = data.bandCounts;

  return (
    <div className="space-y-6">
      {/* Filters row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gender */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Gender
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => toggleFilter('male')}
              className={`flex flex-col items-start rounded-md border px-3 py-2 text-left shadow-sm transition ${
                filters.male
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <span className="text-xs uppercase tracking-wide opacity-70">
                Male
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleFilter('female')}
              className={`flex flex-col items-start rounded-md border px-3 py-2 text-left shadow-sm transition ${
                filters.female
                  ? 'border-pink-700 bg-pink-700 text-white'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <span className="text-xs uppercase tracking-wide opacity-70">
                Female
              </span>
            </button>
          </div>
        </div>

        {/* Bands */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Age bands (1 September)
            </h2>
            <span className="text-xs text-slate-500">
              Click to filter
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {bandOrder.map((band) => {
              const key = `band:${band}` as JuniorFilterKey;
              const count = bandCounts[band] ?? 0;
              const active = filters[key];

              return (
                <button
                  key={band}
                  type="button"
                  onClick={() => toggleFilter(key)}
                  className={`flex flex-col items-center rounded-md border px-2 py-1.5 text-xs shadow-sm transition ${
                    active
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-semibold">{band}</span>
                  <span className="mt-0.5 opacity-80">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* County / district / photo */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Pathway & safeguarding
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => toggleFilter('county')}
              className={`flex flex-col items-start rounded-md border px-3 py-2 text-left shadow-sm transition ${
                filters.county
                  ? 'border-purple-700 bg-purple-700 text-white'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <span className="text-xs uppercase tracking-wide opacity-70">
                County
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleFilter('district')}
              className={`flex flex-col items-start rounded-md border px-3 py-2 text-left shadow-sm transition ${
                filters.district
                  ? 'border-indigo-700 bg-indigo-700 text-white'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <span className="text-xs uppercase tracking-wide opacity-70">
                District
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleFilter('noPhotoConsent')}
              className={`col-span-2 flex flex-col items-start rounded-md border px-3 py-2 text-left shadow-sm transition ${
                filters.noPhotoConsent
                  ? 'border-red-700 bg-red-700 text-white'
                  : 'border-red-100 bg-red-50 hover:bg-red-100 text-red-900'
              }`}
            >
              <span className="text-xs uppercase tracking-wide opacity-80">
                NO photo consent
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Active filters summary */}
      <section>
        {Object.entries(filters).some(([, v]) => v) ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-600">Active filters:</span>
            {Object.entries(filters)
              .filter(([, v]) => v)
              .map(([key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    toggleFilter(key as JuniorFilterKey)
                  }
                  className="inline-flex items-center rounded-full bg-slate-900 text-white px-3 py-1"
                >
                  <span>
                    {key
                      .replace('band:', '')
                      .replace('noPhotoConsent', 'No photo consent')}
                  </span>
                  <span className="ml-2 text-xs">✕</span>
                </button>
              ))}
            <button
              type="button"
              onClick={() =>
                setFilters({
                  male: false,
                  female: false,
                  county: false,
                  district: false,
                  noPhotoConsent: false,
                  'band:U9': false,
                  'band:U10': false,
                  'band:U11': false,
                  'band:U12': false,
                  'band:U13': false,
                  'band:U14': false,
                  'band:U15': false,
                  'band:U16': false,
                  'band:U17': false,
                  'band:U18': false,
                })
              }
              className="text-slate-500 underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Click any tile above to filter the juniors table.
          </p>
        )}
      </section>

      {/* Juniors table */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Junior players
          </h2>
          <p className="text-xs text-slate-500">
            Showing {filteredJuniors.length} of {juniors.length} juniors
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Name
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Gender
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  DOB
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Age Band
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  County / District
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Photo Consent
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Medical Info
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJuniors.map((j) => {
                const name = `${j.first_name ?? ''} ${
                  j.last_name ?? ''
                }`.trim();
                const band = j.age_band ?? '—';

                const photoBadge =
                  j.photo_consent === 'yes'
                    ? 'Yes'
                    : j.photo_consent === 'no'
                    ? 'No'
                    : 'Unknown';

                const medicalBadge =
                  j.medical_info === 'yes'
                    ? 'Recorded'
                    : j.medical_info === 'no'
                    ? 'None'
                    : 'Unknown';

                return (
                  <tr
                    key={j.id}
                    className="border-b border-slate-100 last:border-none"
                  >
                    <td className="px-3 py-2 align-top">
                      <a
                        href={`/admin/clubs/${clubId}/members/${j.id}`}
                        className="font-medium text-blue-600 underline hover:text-blue-800"
                      >
                        {name || 'Unnamed junior'}
                      </a>
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      {j.gender ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      {j.date_of_birth ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      {band}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      <div className="flex flex-col gap-1">
                        {j.is_county_player && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-800">
                            County
                          </span>
                        )}
                        {j.is_district_player && (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-800">
                            District
                          </span>
                        )}
                        {!j.is_county_player &&
                          !j.is_district_player && (
                            <span className="text-[10px] text-slate-400">
                              —
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          j.photo_consent === 'no'
                            ? 'bg-red-100 text-red-800'
                            : j.photo_consent === 'yes'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {photoBadge}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          j.medical_info === 'yes'
                            ? 'bg-amber-100 text-amber-800'
                            : j.medical_info === 'no'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {medicalBadge}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
