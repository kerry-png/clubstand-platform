// app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import AppShell from '@/components/AppShell';
import { getClubFromRequest } from '@/lib/branding/getClubFromRequest';

export const metadata = {
  title: 'ClubStand Membership Portal',
  description:
    'Memberships, payments and games for grassroots clubs – all in one portal.',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  // Load branding from domain or slug
  const { branding } = await getClubFromRequest();

  // Convert branding.cssVars into a proper React style object
  // Example: { "--brand-primary": "#0f172a", "--brand-secondary": "#334155" }
  const cssVarObject: Record<string, string> = {};
  Object.entries(branding.cssVars).forEach(([key, value]) => {
    cssVarObject[key] = value;
  });

  return (
    <html lang="en" style={cssVarObject}>
      <body className="min-h-screen bg-slate-50">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
