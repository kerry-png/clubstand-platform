// app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'ClubStand Membership Portal',
  description:
    'Memberships, payments and games for grassroots clubs – all in one portal.',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
