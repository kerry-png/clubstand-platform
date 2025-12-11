// lib/branding/utils.ts
import 'server-only';

/**
 * Normalises branding fields from a raw club row.
 * This is used in the admin area, where branding MUST follow the clubId,
 * not the domain (Option A).
 */
export function buildBrandingFromClub(club: any) {
  // If no club found, fall back to default ClubStand branding
  if (!club) {
    return {
      primary: '#0f172a',
      secondary: '#334155',
      accent: '#0ea5e9',
      logoUrl: null,
      cssVars: {
        '--brand-primary': '#0f172a',
        '--brand-secondary': '#334155',
        '--brand-accent': '#0ea5e9',
      },
    };
  }

  const primary =
    club.primary_colour ||
    club.primary_color ||
    '#0f172a';

  const secondary =
    club.secondary_colour ||
    '#334155';

  const accent =
    club.accent_colour ||
    club.accent_color ||
    '#0ea5e9';

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
