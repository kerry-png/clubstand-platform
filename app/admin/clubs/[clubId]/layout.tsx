// app/admin/clubs/[clubId]/layout.tsx

import type { ReactNode } from "react";
import { supabaseServerClient } from "@/lib/supabaseServer";
import ClubAdminShell from "./ClubAdminShell";

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
  // Next 16: params is a Promise
  const { clubId } = await params;

  const { data: club } = await supabaseServerClient
    .from("clubs")
    .select("id, name, slug, logo_url, primary_colour, secondary_colour")
    .eq("id", clubId)
    .maybeSingle();

  const theme = {
    clubId,
    clubName: club?.name ?? "Club",
    slug: club?.slug ?? "club",
    logoUrl: club?.logo_url ?? null,
    primary: club?.primary_colour ?? "#0f172a",
    secondary: club?.secondary_colour ?? "#475569",
  };

  return <ClubAdminShell theme={theme}>{children}</ClubAdminShell>;
}
