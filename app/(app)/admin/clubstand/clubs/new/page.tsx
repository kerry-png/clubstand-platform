// app/admin/clubstand/clubs/new/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import { supabaseServerClient } from '@/lib/supabaseServer';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default async function CreateClubPage() {
  await requirePlatformAdmin({ redirectTo: '/admin/clubstand/clubs/new' });

  async function createClubAction(formData: FormData) {
    'use server';

    await requirePlatformAdmin({ redirectTo: '/admin/clubstand/clubs/new' });

    const nameRaw = String(formData.get('name') ?? '').trim();
    const slugRaw = String(formData.get('slug') ?? '').trim();
    const subdomainRaw = String(formData.get('subdomain') ?? '').trim();

    const primary = String(formData.get('primary_colour') ?? '').trim() || null;
    const secondary =
      String(formData.get('secondary_colour') ?? '').trim() || null;
    const accent = String(formData.get('accent_colour') ?? '').trim() || null;

    const name = nameRaw;
    const slug = slugRaw ? slugify(slugRaw) : slugify(nameRaw);
    const subdomain = subdomainRaw ? slugify(subdomainRaw) : null;

    if (!name) {
      redirect('/admin/clubstand/clubs/new?error=missing_name');
    }

    if (!slug) {
      redirect('/admin/clubstand/clubs/new?error=missing_slug');
    }

    const { error } = await supabaseServerClient.from('clubs').insert({
      name,
      slug,
      subdomain,
      primary_colour: primary,
      secondary_colour: secondary,
      accent_colour: accent,
      is_active: true,
    });

    if (error) {
      console.error('Create club failed', error);
      // keep it simple: bounce back with an error flag (we’ll polish later)
      redirect('/admin/clubstand/clubs/new?error=create_failed');
    }

    redirect('/admin/clubstand/clubs');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--brand-primary)' }}
          >
            Create club
          </h1>
          <p className="text-sm text-slate-600">
            Adds a new club record. Branding can be edited afterwards.
          </p>
        </div>

        <Link
          href="/admin/clubstand/clubs"
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
        >
          Back to clubs
        </Link>
      </div>

      <form
        action={createClubAction}
        className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 max-w-xl"
      >
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">
            Club name
          </label>
          <input
            name="name"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Rainhill Cricket Club"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">
            Slug
            <span className="ml-2 text-xs font-normal text-slate-500">
              (used for /club/&lt;slug&gt;)
            </span>
          </label>
          <input
            name="slug"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="rainhill-cc"
          />
          <p className="text-xs text-slate-500">
            Leave blank to auto-generate from the name.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">
            Subdomain
            <span className="ml-2 text-xs font-normal text-slate-500">
              (optional)
            </span>
          </label>
          <input
            name="subdomain"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="rainhillcc"
          />
          <p className="text-xs text-slate-500">
            Example: rainhillcc.clubstand.uk (when DNS is set up later).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Primary colour
            </label>
            <input
              name="primary_colour"
              className="w-full rounded-md border px-3 py-2 text-sm font-mono"
              placeholder="#0B1F3A"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Secondary colour
            </label>
            <input
              name="secondary_colour"
              className="w-full rounded-md border px-3 py-2 text-sm font-mono"
              placeholder="#FFFFFF"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">
              Accent colour
            </label>
            <input
              name="accent_colour"
              className="w-full rounded-md border px-3 py-2 text-sm font-mono"
              placeholder="#2F6FED"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2">
          <button
            type="submit"
            className="rounded-md px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            Create club
          </button>

          <Link
            href="/admin/clubstand/clubs"
            className="rounded-md border px-4 py-2 text-sm font-semibold"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
