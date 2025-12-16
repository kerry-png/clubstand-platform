// app/admin/clubstand/clubs/[clubId]/ui/ClubBrandingEditorClient.tsx
'use client';

import { useMemo, useState } from 'react';

type Club = {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  is_active: boolean;
  logo_url: string | null;
  primary_colour: string | null;
  secondary_colour: string | null;
  accent_colour: string | null;
};

function normaliseHex(input: string) {
  const v = input.trim();
  if (!v) return '';
  if (v.startsWith('#')) return v;
  return `#${v}`;
}

export default function ClubBrandingEditorClient({ club }: { club: Club }) {
  const [primary, setPrimary] = useState(club.primary_colour ?? '');
  const [secondary, setSecondary] = useState(club.secondary_colour ?? '');
  const [accent, setAccent] = useState(club.accent_colour ?? '');
  const [logoUrl, setLogoUrl] = useState(club.logo_url ?? '');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewStyle = useMemo(() => {
    return {
      ['--brand-primary' as any]: primary || 'var(--brand-primary)',
      ['--brand-secondary' as any]: secondary || 'var(--brand-secondary)',
      ['--brand-accent' as any]: accent || 'var(--brand-accent)',
    } as React.CSSProperties;
  }, [primary, secondary, accent]);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch(`/admin/clubstand/clubs/${club.id}/branding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_colour: primary ? normaliseHex(primary) : null,
          secondary_colour: secondary ? normaliseHex(secondary) : null,
          accent_colour: accent ? normaliseHex(accent) : null,
          logo_url: logoUrl.trim() || null,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.details || json?.error || 'Save failed');
      }

      setSaved(true);
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setError(null);
    setSaved(false);

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`/admin/clubstand/clubs/${club.id}/logo`, {
        method: 'POST',
        body: fd,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.details || json?.error || 'Logo upload failed');
      }

      if (json?.logoUrl) {
        setLogoUrl(String(json.logoUrl));
        setSaved(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Logo upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Primary colour
            </label>
            <input
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
              placeholder="#0B1F3A"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Accent colour
            </label>
            <input
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
              placeholder="#2F6FED"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Secondary colour
            </label>
            <input
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
              placeholder="#FFFFFF"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Logo
            </label>

            <div className="mt-1 space-y-2">
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="https://… (or upload below)"
              />

          <div className="flex flex-wrap items-center gap-3">
            <input
              id="club-logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
                e.currentTarget.value = '';
              }}
              className="hidden"
              disabled={uploading}
            />
            <label
              htmlFor="club-logo-upload"
              className="inline-flex cursor-pointer items-center rounded-md px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              style={{
                backgroundColor: 'var(--brand-primary)',
                opacity: uploading ? 0.7 : 1,
                pointerEvents: uploading ? 'none' : 'auto',
              }}
            >
              {uploading ? 'Uploading…' : 'Upload logo'}
            </label>

            <span className="text-xs text-slate-500">
              PNG/JPG/WEBP/SVG, max 2MB
            </span>
          </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {saving ? 'Saving…' : 'Save branding'}
          </button>

          {saved && <span className="text-xs text-green-700">Saved</span>}
          {error && <span className="text-xs text-red-700">{error}</span>}
        </div>
      </div>

      {/* Live preview (uses the entered colours) */}
      <div
        className="rounded-xl border border-slate-200 p-5 space-y-4"
        style={{
          ...previewStyle,
          backgroundColor: 'var(--brand-secondary)',
        }}
      >
        {/* Header-ish preview */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {logoUrl.trim() ? (
              <img
                src={logoUrl.trim()}
                alt="Logo preview"
                className="h-10 w-10 rounded-full border object-contain"
                style={{ borderColor: 'rgba(0,0,0,0.08)' }}
              />
            ) : (
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {club.name.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="leading-tight">
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--brand-primary)' }}
              >
                Preview: {club.name}
              </div>
              <div className="text-xs" style={{ color: 'var(--brand-accent)' }}>
                Accent example (links, small emphasis)
              </div>
            </div>
          </div>

          <button
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--brand-primary)' }}
            type="button"
          >
            Primary button
          </button>
        </div>

        {/* Secondary / page background preview */}
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: 'rgba(0,0,0,0.08)' }}
        >
          <div className="text-xs text-slate-600">
            This panel is sitting on <span className="font-mono">secondary</span>{' '}
            (page background).
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-xs underline"
              style={{ color: 'var(--brand-accent)' }}
            >
              Accent link
            </a>

            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: 'var(--brand-accent)',
                color: 'var(--brand-accent)',
              }}
            >
              Accent outline
            </button>

            <span
              className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold text-white"
              style={{ backgroundColor: 'var(--brand-accent)' }}
            >
              Accent badge
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: 'rgba(0,0,0,0.08)' }}
          >
            <div className="text-xs font-semibold text-slate-700">Primary</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="inline-block h-5 w-5 rounded"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              />
              <span className="text-xs text-slate-600">
                Buttons, headings, active nav
              </span>
            </div>
          </div>

          <div
            className="rounded-lg border p-3"
            style={{ borderColor: 'rgba(0,0,0,0.08)' }}
          >
            <div className="text-xs font-semibold text-slate-700">Secondary</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="inline-block h-5 w-5 rounded border"
                style={{
                  backgroundColor: 'var(--brand-secondary)',
                  borderColor: 'rgba(0,0,0,0.08)',
                }}
              />
              <span className="text-xs text-slate-600">
                Page / sidebar background
              </span>
            </div>
          </div>

          <div
            className="rounded-lg border p-3"
            style={{ borderColor: 'rgba(0,0,0,0.08)' }}
          >
            <div className="text-xs font-semibold text-slate-700">Accent</div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="inline-block h-5 w-5 rounded"
                style={{ backgroundColor: 'var(--brand-accent)' }}
              />
              <span className="text-xs text-slate-600">
                Links, small emphasis, focus
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
