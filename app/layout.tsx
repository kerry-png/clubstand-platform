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
  const { branding } = await getClubFromRequest();

  // CSS variables must be applied on <html> so they’re available everywhere
  const cssVarObject: Record<string, string> = {};
  Object.entries(branding.cssVars).forEach(([key, value]) => {
    cssVarObject[key] = value;
  });

  return (
    <html lang="en" style={cssVarObject}>
      <body
        className="min-h-screen"
        style={{
          backgroundColor: 'var(--brand-bg)',
          color: 'var(--brand-text)',
        }}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
