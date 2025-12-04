// app/admin/clubs/[clubId]/dashboard/ClubDashboardClient.tsx

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

type CardFilterKey =
  | 'male'
  | 'female'
  | 'junior'
  | 'adult'
  | 'county'
  | 'district'
  | 'activeMembership'
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

export default function ClubDashboardClient({ clubId }: Props) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonYear] = useState<number>(2026); // match pricing config for now
  const [activeFilters, setActiveFilters] = useState<
    Record<CardFilterKey, boolean>
  >({
    male: false,
    female: false,
    junior: false,
    adult: false,
    county: false,
    district: false,
    activeMembership: false,
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
        console.log('ClubDashboardClient loading', { clubId, seasonYear });

        const res = await fetch(
          `/api/admin/clubs/${clubId}/stats?year=${seasonYear}`,
          { cache: 'no-store' },
        );

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const msg =
            json?.error ??
            `Failed to load dashboard stats (status ${res.status})`;
          throw new Error(msg);
        }

        const json = (await res.json()) as StatsResponse;

        if (!cancelled) {
          setData(json);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('ClubDashboardClient load error', err);
          setError(
            err?.message ?? 'Failed to load club dashboard stats',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    // Always attempt to load – even if clubId is somehow undefined,
    // we’ll get a 400 from the API and show an error instead of
    // being stuck on "Loading…"
    load();

    return () => {
      cancelled = true;
    };
  }, [clubId, seasonYear]);


  function toggleFilter(key: CardFilterKey) {
    setActiveFilters((prev: Record<CardFilterKey, boolean>) => ({
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

  const filteredMembers = useMemo(() => {
    if (!data) return [];

    const members = data.members;

    const genderSelected =
      activeFilters.male || activeFilters.female;
    const anyBandSelected = bandOrder.some(
      (b) => activeFilters[`band:${b}` as CardFilterKey],
    );

    return members.filter((m) => {
      // gender filters
      if (genderSelected) {
        const g = (m.gender ?? '').toLowerCase();
        const maleOn = activeFilters.male;
        const femaleOn = activeFilters.female;

        if (maleOn && !femaleOn && g !== 'male') return false;
        if (femaleOn && !maleOn && g !== 'female') return false;
        if (maleOn && femaleOn && g !== 'male' && g !== 'female') {
          return false;
        }
      }

      // junior/adult filters
      if (activeFilters.junior && !m.is_junior) return false;
      if (
        activeFilters.adult &&
        m.is_junior
      )
        return false;

      // county / district
      if (activeFilters.county && !m.is_county_player) return false;
      if (
        activeFilters.district &&
        !m.is_district_player
      )
        return false;

      // active membership
      if (
        activeFilters.activeMembership &&
        !m.has_active_membership
      ) {
        return false;
      }

      // no photo consent (juniors mainly)
      if (
        activeFilters.noPhotoConsent &&
        m.photo_consent !== 'no'
      ) {
        return false;
      }

      // age band
      if (anyBandSelected) {
        const band = m.age_band;
        if (!band) return false;
        const key = `band:${band}` as CardFilterKey;
        if (!activeFilters[key]) return false;
      }

      return true;
    });
  }, [data, activeFilters, bandOrder]);

  if (loading) {
    return (
      <p className="text-sm text-slate-600">
        Loading members…
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

  const { totals, bandCounts, members } = data;

  return (
    <div className="space-y-6">
      {/* Top row: overall stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => toggleFilter('adult')}
          className={`flex flex-col items-start rounded-lg border px-4 py-3 text-left shadow-sm transition ${
            activeFilters.adult
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-xs uppercase tracking-wide opacity-70">
            Total members ({seasonYear})
          </span>
          <span className="mt-1 text-2xl font-semibold">
            {totals.totalMembers}
          </span>
          <span className="mt-1 text-xs opacity-80">
            Active: {totals.activeMembers}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleFilter('male')}
          className={`flex flex-col items-start rounded-lg border px-4 py-3 text-left shadow-sm transition ${
            activeFilters.male
              ? 'border-blue-700 bg-blue-700 text-white'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-xs uppercase tracking-wide opacity-70">
            Male members
          </span>
          <span className="mt-1 text-2xl font-semibold">
            {totals.male}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleFilter('female')}
          className={`flex flex-col items-start rounded-lg border px-4 py-3 text-left shadow-sm transition ${
            activeFilters.female
              ? 'border-pink-700 bg-pink-700 text-white'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-xs uppercase tracking-wide opacity-70">
            Female members
          </span>
          <span className="mt-1 text-2xl font-semibold">
            {totals.female}
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleFilter('junior')}
          className={`flex flex-col items-start rounded-lg border px-4 py-3 text-left shadow-sm transition ${
            activeFilters.junior
              ? 'border-emerald-700 bg-emerald-700 text-white'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="text-xs uppercase tracking-wide opacity-70">
            Junior members
          </span>
          <span className="mt-1 text-2xl font-semibold">
            {totals.juniors}
          </span>
          <span className="mt-1 text-xs opacity-80">
            ♂ {totals.juniorsMale} • ♀ {totals.juniorsFemale}
          </span>
        </button>
      </section>

      {/* Row 2: junior bands + county/district + safeguarding */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Junior bands */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Junior age bands (on 1 September)
            </h2>
            <span className="text-xs text-slate-500">
              Click to filter list
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {bandOrder.map((band) => {
              const key = `band:${band}` as CardFilterKey;
              const count = bandCounts[band] ?? 0;
              const active = activeFilters[key];

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

        {/* County / district */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Performance pathway
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => toggleFilter('county')}
              className={`flex flex-col items-start rounded-md border px-3 py-2 text-left shadow-sm transition ${
                activeFilters.county
                  ? 'border-purple-700 bg-purple-700 text-white'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <span className="text-xs uppercase tracking-wide opacity-70">
                County
              </span>
              <span className="mt-1 text-xl font-semibold">
                {totals.countyPlayers}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleFilter('district')}
              className={`flex flex-col items-start rounded-md border px-3 py-2 text-left shadow-sm transition ${
                activeFilters.district
                  ? 'border-indigo-700 bg-indigo-700 text-white'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <span className="text-xs uppercase tracking-wide opacity-70">
                District
              </span>
              <span className="mt-1 text-xl font-semibold">
                {totals.districtPlayers}
              </span>
            </button>
          </div>
        </div>

        {/* Safeguarding / consents */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Safeguarding flags
          </h2>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => toggleFilter('noPhotoConsent')}
              className={`flex w-full flex-col items-start rounded-md border px-3 py-2 text-left shadow-sm transition ${
                activeFilters.noPhotoConsent
                  ? 'border-red-700 bg-red-700 text-white'
                  : 'border-red-100 bg-red-50 hover:bg-red-100 text-red-900'
              }`}
            >
              <span className="text-xs uppercase tracking-wide opacity-80">
                Juniors with NO photo consent
              </span>
              <span className="mt-1 text-xl font-semibold">
                {totals.juniorsNoPhotoConsent}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Active filters summary */}
      <section>
        {Object.entries(activeFilters).some(([, v]) => v) ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-600">Active filters:</span>
            {Object.entries(activeFilters)
              .filter(([, v]) => v)
              .map(([key]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    toggleFilter(key as CardFilterKey)
                  }
                  className="inline-flex items-center rounded-full bg-slate-900 text-white px-3 py-1"
                >
                  <span>
                    {key
                      .replace('band:', '')
                      .replace('noPhotoConsent', 'No photo consent')
                      .replace('activeMembership', 'Active membership')}
                  </span>
                  <span className="ml-2 text-xs">✕</span>
                </button>
              ))}
            <button
              type="button"
              onClick={() =>
                setActiveFilters({
                  male: false,
                  female: false,
                  junior: false,
                  adult: false,
                  county: false,
                  district: false,
                  activeMembership: false,
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
            Click any tile above to filter the members list.
          </p>
        )}
      </section>

      {/* Members table */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Members overview
          </h2>
          <p className="text-xs text-slate-500">
            Showing {filteredMembers.length} of {members.length} members
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
                  Type
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Gender
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  DOB
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Age band
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  County / District
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Photo consent
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Medical info
                </th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">
                  Membership
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const name = `${m.first_name ?? ''} ${
                  m.last_name ?? ''
                }`.trim();

                const band = m.age_band ?? '—';
                const isAdult = !m.is_junior;

                const photoBadge =
                  m.photo_consent === 'yes'
                    ? 'Yes'
                    : m.photo_consent === 'no'
                    ? 'No'
                    : 'Unknown';

                const medicalBadge =
                  m.medical_info === 'yes'
                    ? 'Recorded'
                    : m.medical_info === 'no'
                    ? 'None'
                    : 'Unknown';

                return (
                  <tr
                    key={m.id}
                    className="border-b border-slate-100 last:border-none"
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-slate-900">
                        {name || 'Unnamed member'}
                      </div>
                      <div className="text-slate-500">
                        {m.status}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      {m.member_type}
                      {isAdult && ' (adult)'}
                      {m.is_junior && ' (junior)'}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      {m.gender ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      {m.date_of_birth ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      {band}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-700">
                      <div className="flex flex-col gap-1">
                        {m.is_county_player && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-800">
                            County
                          </span>
                        )}
                        {m.is_district_player && (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-800">
                            District
                          </span>
                        )}
                        {!m.is_county_player &&
                          !m.is_district_player && (
                            <span className="text-[10px] text-slate-400">
                              —
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          m.photo_consent === 'no'
                            ? 'bg-red-100 text-red-800'
                            : m.photo_consent === 'yes'
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
                          m.medical_info === 'yes'
                            ? 'bg-amber-100 text-amber-800'
                            : m.medical_info === 'no'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {medicalBadge}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {m.has_active_membership ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                            Active
                          </span>
                          {m.latest_membership_start && (
                            <span className="text-[10px] text-slate-500">
                              since{' '}
                              {new Date(
                                m.latest_membership_start,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          No active membership
                        </span>
                      )}
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
