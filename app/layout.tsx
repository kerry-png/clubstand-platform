// app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import NavBar from '@/components/NavBar';

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
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <NavBar />
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
