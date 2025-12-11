'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NavBar from '@/components/NavBar';

// This helper fetches pre-resolved branding from the server via a lightweight endpoint.
// We cannot call getClubFromRequest() directly in a client component.
async function fetchBranding() {
  const res = await fetch('/api/branding');
  if (!res.ok) return null;
  return res.json();
}

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  // Store branding resolved on the server
  const [branding, setBranding] = useState<any>(null);

  // On mount, request branding (logo + colours)
  useEffect(() => {
    fetchBranding().then((data) => {
      if (data) setBranding(data);
    });
  }, []);

  // ADMIN AREA → completely white-label; no NavBar at all
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // PUBLIC / MEMBER AREA → show NavBar themed with branding
  return (
    <>
      <NavBar branding={branding} />
      {children}
    </>
  );
}
