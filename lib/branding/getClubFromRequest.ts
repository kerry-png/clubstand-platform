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
 * Default ClubStand branding (fallback when club cannot be detected)
 */
const DEFAULT_BRANDING: ClubBranding = {
  primary: '#0B1F3A',
  secondary: '#FFFFFF',
  accent: '#2F6FED',
  logoUrl: null,
  cssVars: {
    '--brand-primary': '#0B1F3A',
    '--brand-secondary': '#FFFFFF',
    '--brand-accent': '#2F6FED',
    '--brand-bg': '#FFFFFF',
    '--brand-surface': '#F8FAFC',
    '--brand-text': '#0B1F3A',
  },
};

/**
 * Build branding object from club row.
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
      '--brand-bg': DEFAULT_BRANDING.cssVars['--brand-bg'],
      '--brand-surface': DEFAULT_BRANDING.cssVars['--brand-surface'],
      '--brand-text': DEFAULT_BRANDING.cssVars['--brand-text'],
    },
  };
}

/**
 * Extract subdomain from host.
 */
function extractSubdomain(host: string | null): string | null {
  if (!host) return null;

  const clean = host.split(':')[0];
  const parts = clean.split('.');

  if (parts.length < 3) return null;

  return parts[0];
}

/**
 * Non-cached lookup (used for admin pages so branding updates instantly)
 */
async function lookupUncached(
  subdomain: string | null,
  slug: string | null,
): Promise<ClubBrandingResult> {
  let club: any | null = null;

  if (subdomain) {
    const { data } = await supabaseServerClient
      .from('clubs')
      .select('*')
      .eq('subdomain', subdomain)
      .eq('is_active', true)
      .maybeSingle();

    if (data) club = data;
  }

  if (!club && slug) {
    const { data } = await supabaseServerClient
      .from('clubs')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (data) club = data;
  }

  if (!club) {
    return { club: null, branding: DEFAULT_BRANDING };
  }

  return { club, branding: buildBrandingFromClub(club) };
}

/**
 * Cached lookup (public-facing)
 */
const cachedLookup = unstable_cache(
  lookupUncached,
  ['club-branding-lookup'],
  { revalidate: 300 },
);

/**
 * Main resolver
 */
export async function getClubFromRequest(
  slugFromRoute?: string | null,
): Promise<ClubBrandingResult> {
  const hdrs = await headers();
  const host = hdrs.get('host');
  const pathname = hdrs.get('x-pathname') ?? '';
  const subdomain = extractSubdomain(host);

  // Admin & ClubStand pages should always be fresh
  const isAdminContext =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/clubstand');

  if (isAdminContext) {
    return lookupUncached(subdomain, slugFromRoute ?? null);
  }

  return cachedLookup(subdomain, slugFromRoute ?? null);
}
