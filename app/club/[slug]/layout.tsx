// app/club/[slug]/layout.tsx
import type { ReactNode } from 'react';
import { getClubFromRequest } from '@/lib/branding/getClubFromRequest';

export default async function ClubSlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { branding } = await getClubFromRequest(slug);

  // Apply CSS vars for this club to everything under /club/[slug]/*
  return <div style={branding.cssVars as React.CSSProperties}>{children}</div>;
}
