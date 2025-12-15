// app/admin/clubstand/clubs/page.tsx
import Link from 'next/link';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import { supabaseServerClient } from '@/lib/supabaseServer';

type ClubRow = {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  is_active: boolean;
  primary_colour: string | null;
  primary_color: string | null;
  accent_colour: string | null;
  accent_color: string | null;
  secondary_colour: string | null;
};

function normaliseColour(...values: Array<string | null | undefined>) {
  const v = values.find((x) => typeof x === 'string' && x.trim().length > 0);
  return v ?? null;
}

export default async function ClubStandClubsPage() {
  await requirePlatformAdmin({ redirectTo: '/admin/clubstand/clubs' });

  const { data, error } = await supabaseServerClient
    .from('clubs')
    .select(
      'id,name,slug,subdomain,is_active,primary_colour,primary_color,accent_colour,accent_color,secondary_colour',
    )
    .order('name', { ascending: true });

  if (error) {
    console.error('Error loading clubs', error);
  }

  const clubs = (data ?? []) as ClubRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--brand-primary)' }}
          >
            Clubs
          </h1>
          <p className="text-sm text-slate-600">
            Create and manage clubs on the platform.
          </p>
        </div>

        <Link
          href="/admin/clubstand/clubs/new"
          className="rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          Create club
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {clubs.length === 0 && (
            <div className="p-4 text-sm text-slate-600">No clubs yet.</div>
          )}

          {clubs.map((c) => {
            const primary = normaliseColour(c.primary_colour, c.primary_color);
            const accent = normaliseColour(c.accent_colour, c.accent_color);
            const dot = primary ?? 'var(--brand-primary)';

            return (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: dot }}
                    aria-hidden
                  />
                  <div className="leading-tight">
                    <div className="font-semibold text-sm text-slate-900">
                      {c.name}{' '}
                      {!c.is_active && (
                        <span className="ml-2 text-[11px] font-medium text-slate-500">
                          (inactive)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600">
                      slug: <span className="font-mono">{c.slug}</span>
                      {c.subdomain ? (
                        <>
                          {' '}
                          · subdomain:{' '}
                          <span className="font-mono">{c.subdomain}</span>
                        </>
                      ) : null}
                      {accent ? (
                        <>
                          {' '}
                          · accent: <span className="font-mono">{accent}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/clubstand/clubs/${c.id}`}
                    className="rounded-md border px-3 py-1.5 text-xs font-semibold"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Tip: “Edit” will be the branding editor next.
      </p>
    </div>
  );
}
