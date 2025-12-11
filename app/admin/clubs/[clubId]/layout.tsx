//app/admin/clubs/[clubId]/layout/tsx
import type { ReactNode } from "react";
import { supabaseServerClient } from "@/lib/supabaseServer";
import ClubAdminShell from "./ClubAdminShell";
import { buildBrandingFromClub } from "@/lib/branding/utils"; // NEW helper (see below)

type LayoutParams = {
  clubId: string;
};

type LayoutProps = {
  children: ReactNode;
  params: Promise<LayoutParams>;
};

export default async function ClubAdminLayout({
  children,
  params,
}: LayoutProps) {
  const { clubId } = await params;

  // Load the club by ID using service-role client
  const { data: club } = await supabaseServerClient
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .eq("is_active", true)
    .maybeSingle();

  // Fallback ensures admin can still load even if club null
  const branding = buildBrandingFromClub(club);

  const theme = {
    clubId,
    clubName: club?.name ?? "Club",
    slug: club?.slug ?? "club",
    logoUrl: branding.logoUrl,
    primary: branding.primary,
    secondary: branding.secondary,
  };

  return <ClubAdminShell theme={theme}>{children}</ClubAdminShell>;
}
