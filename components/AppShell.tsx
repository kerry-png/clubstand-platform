// components/AppShell.tsx
'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import NavBar from '@/components/NavBar';

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  const pathname = usePathname();

  // Any route under /admin should NOT show the ClubStand NavBar
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    // Admin area: completely white-label, no ClubStand header
    return <>{children}</>;
  }

  // Public / member area: show your existing NavBar with login / logout
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
