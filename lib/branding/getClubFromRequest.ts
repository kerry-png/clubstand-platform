// lib/branding/getClubFromRequest.ts
import 'server-only';

import { headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { supabaseServerClient } from '@/lib/supabaseServer';

/**
 * The shape returned by this function.
 */
export type ClubBranding = {
  primary: string;
  secondary: string;
  accent: string;
  logoUrl: string | null;
  cssVars: Record<string, string>;
};

export type ClubBrandingResult = {
  club: any | null;
  branding: ClubBranding;
};

/**
 * Default ClubStand branding (Option A)
 */
const DEFAULT_BRANDING: ClubBranding = {
  primary: '#0f172a', // slate-900
  secondary: '#334155', // slate-700
  accent: '#0ea5e9', // sky-500
  logoUrl: null,
  cssVars: {
    '--brand-primary': '#0f172a',
    '--brand-secondary': '#334155',
    '--brand-accent': '#0ea5e9',
  },
};

/**
 * Normalises colour fields from the DB.
 */
function buildBrandingFromClub(club: any | null): ClubBranding {
  if (!club) return DEFAULT_BRANDING;

  const primary =
    club.primary_colour ||
    club.primary_color ||
    DEFAULT_BRANDING.primary;

  const secondary =
    club.secondary_colour ||
    DEFAULT_BRANDING.secondary;

  const accent =
    club.accent_colour ||
    club.accent_color ||
    DEFAULT_BRANDING.accent;

  const logoUrl = club.logo_url ?? null;

  return {
    primary,
    secondary,
    accent,
    logoUrl,
    cssVars: {
      '--brand-primary': primary,
      '--brand-secondary': secondary,
      '--brand-accent': accent,
    },
  };
}

/**
 * Extract subdomain from host.
 */
function extractSubdomain(host: string | null): string | null {
  if (!host) return null;

  const clean = host.split(':')[0]; // strip port if present
  const parts = clean.split('.');

  // e.g. rainhillcc.clubstand.uk → ["rainhillcc","clubstand","uk"]
  if (parts.length < 3) return null;

  return parts[0];
}

/**
 * Cached DB lookup.
 */
const cachedLookup = unstable_cache(
  async (subdomain: string | null, slug: string | null): Promise<ClubBrandingResult> => {
    let club: any | null = null;

    // 1️⃣ Subdomain lookup
    if (subdomain) {
      const { data } = await supabaseServerClient
        .from('clubs')
        .select('*')
        .eq('subdomain', subdomain)
        .eq('is_active', true)
        .maybeSingle();

      if (data) club = data;
    }

    // 2️⃣ Slug fallback
    if (!club && slug) {
      const { data } = await supabaseServerClient
        .from('clubs')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (data) club = data;
    }

    // 3️⃣ Default branding
    if (!club) {
      return {
        club: null,
        branding: DEFAULT_BRANDING,
      };
    }

    return {
      club,
      branding: buildBrandingFromClub(club),
    };
  },
  ['club-branding-lookup'],
  { revalidate: 300 }
);

/**
 * Main resolver:
 * - awaits Next headers()
 * - extracts subdomain
 * - sends to cache
 */
export async function getClubFromRequest(slugFromRoute?: string | null): Promise<ClubBrandingResult> {
  const hdrs = await headers();     // 🔧 FIX: headers() is async in Next 16
  const host = hdrs.get('host');    // Now this is safe
  const subdomain = extractSubdomain(host);

  const result = await cachedLookup(subdomain, slugFromRoute ?? null);
  return result;
}
