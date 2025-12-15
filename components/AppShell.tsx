// components/AppShell.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NavBar from './NavBar';

type Branding = {
  primary: string;
  secondary: string;
  accent: string;
  logoUrl: string | null;
  cssVars: Record<string, string>;
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [club, setClub] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBranding() {
      try {
        const res = await fetch(`/api/branding?path=${encodeURIComponent(pathname)}`, {
          cache: 'no-store',
        });

        if (!res.ok) return;

        const json = await res.json();

        if (cancelled) return;

        setBranding(json.branding ?? null);
        setClub(json.club ?? null);
      } catch {
        // ignore
      }
    }

    loadBranding();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Apply CSS vars client-side too (helps for header components that rely on vars)
  const cssVarObject: Record<string, string> = {};
  if (branding?.cssVars) {
    Object.entries(branding.cssVars).forEach(([k, v]) => {
      cssVarObject[k] = v;
    });
  }

  return (
    <div style={cssVarObject as React.CSSProperties}>
      <NavBar branding={branding} club={club} />
      {children}
    </div>
  );
}
