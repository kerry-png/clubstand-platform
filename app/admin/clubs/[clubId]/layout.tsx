// app/admin/clubs/[clubId]/layout.tsx
import type { ReactNode } from 'react';
import { supabaseServerClient } from '@/lib/supabaseServer';
import ClubAdminShell from './ClubAdminShell';
import { getClubFromRequest } from '@/lib/branding/getClubFromRequest';

type LayoutParams = {
  clubId: string;
};

type LayoutProps = {
  children: ReactNode;
  params: Promise<LayoutParams>;
};

export default async function ClubAdminLayout({ children, params }: LayoutProps) {
  const { clubId } = await params;

  // Load club by ID
  const { data: club } = await supabaseServerClient
    .from('clubs')
    .select('*')
    .eq('id', clubId)
    .eq('is_active', true)
    .maybeSingle();

  // Build branding (uses ClubStand defaults if club missing)
  // We can reuse getClubFromRequest’s branding builder by passing a slug when available.
  // If club is already loaded, we still need its normalised colours/logo.
  const { branding } = club
    ? await getClubFromRequest(club.slug)
    : await getClubFromRequest(null);

  const theme = {
    clubId,
    clubName: club?.name ?? 'Club',
    slug: club?.slug ?? 'club',
    logoUrl: branding.logoUrl,
    primary: branding.primary,
    secondary: branding.secondary,
    accent: branding.accent,
  };

  // Apply club CSS vars to everything in this admin subtree
  return (
    <div style={branding.cssVars as React.CSSProperties}>
      <ClubAdminShell theme={theme}>{children}</ClubAdminShell>
    </div>
  );
}
