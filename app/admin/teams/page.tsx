// app/admin/teams/page.tsx
import { supabaseServerClient } from "@/lib/supabaseServer";

type TeamRow = {
  id: string;
  name: string;
  short_name: string | null;
  slug: string;
  level: string;
  format: string;
  age_group: string | null;
  is_junior: boolean;
  is_women: boolean;
  is_softball: boolean;
  is_primary_club_xi: boolean;
  sort_order: number | null;
};

async function getTeams() {
  const { data, error } = await supabaseServerClient
    .from("teams")
    .select(
      "id, name, short_name, slug, level, format, age_group, is_junior, is_women, is_softball, is_primary_club_xi, sort_order"
    )
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  return { teams: (data ?? []) as TeamRow[], error };
}

export default async function AdminTeamsPage() {
  const { teams, error } = await getTeams();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Teams</h1>
      <p className="text-sm text-slate-600 max-w-xl">
        These teams are coming directly from your Supabase{" "}
        <code>teams</code> table. We&apos;ve seeded the Rainhill CC structure
        (juniors, women and senior XIs).
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Error loading teams: {error.message}
        </div>
      )}

      {teams.length === 0 ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
          <p>No teams found yet.</p>
          <p className="mt-1">
            Once teams are created in Supabase, they will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden text-sm">
          <div className="max-h-[480px] overflow-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 border-b">Name</th>
                  <th className="px-3 py-2 border-b">Level</th>
                  <th className="px-3 py-2 border-b">Format</th>
                  <th className="px-3 py-2 border-b">Age group</th>
                  <th className="px-3 py-2 border-b">Flags</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 border-b">
                      <div className="font-medium">{t.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {t.short_name || t.slug}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-b text-xs">
                      {t.level}
                    </td>
                    <td className="px-3 py-2 border-b text-xs">
                      {t.format}
                    </td>
                    <td className="px-3 py-2 border-b text-xs">
                      {t.age_group || "—"}
                    </td>
                    <td className="px-3 py-2 border-b text-[11px] text-slate-600 space-x-1">
                      {t.is_junior && (
                        <span className="inline-flex rounded-full border px-2 py-[1px]">
                          Junior
                        </span>
                      )}
                      {t.is_women && (
                        <span className="inline-flex rounded-full border px-2 py-[1px]">
                          Women
                        </span>
                      )}
                      {t.is_softball && (
                        <span className="inline-flex rounded-full border px-2 py-[1px]">
                          Softball
                        </span>
                      )}
                      {t.is_primary_club_xi && (
                        <span className="inline-flex rounded-full border px-2 py-[1px]">
                          1st XI
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
