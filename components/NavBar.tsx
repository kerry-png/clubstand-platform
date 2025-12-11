// components/NavBar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type User = {
  email?: string | null;
};

type NavBarProps = {
  branding?: {
    primary: string;
    secondary: string;
    accent: string;
    logoUrl: string | null;
  } | null;
  club?: any | null;
};

export default function NavBar({ branding, club }: NavBarProps) {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error) {
          setUser(data.user ?? null);
        }
      })
      .finally(() => {
        if (isMounted) setInitialised(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();

    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }

    window.location.href = '/';
  };

  // BRANDING LOGIC ----------------------------------------------

  const logoUrl = branding?.logoUrl ?? null;

  // If no logo → fallback initials from club short name or name
  const fallbackInitials = (() => {
    const text =
      club?.short_name ??
      club?.name ??
      'CS';
    return text
      .split(/\s+/)
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  })();

  const primary = 'var(--brand-primary)';
  const secondary = 'var(--brand-secondary)';
  const accent = 'var(--brand-accent)';

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

        {/* LEFT SIDE — BRAND */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">

            {/* LOGO OR FALLBACK */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Club logo"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-semibold"
                style={{ background: primary }}
              >
                {fallbackInitials}
              </span>
            )}

            {/* TEXT LABELS (optional for now; can white-label fully later) */}
            <span className="flex flex-col leading-tight">
              <span
                className="font-semibold text-sm"
                style={{ color: primary }}
              >
                {club?.name ?? 'ClubStand Membership'}
              </span>

              <span className="text-[11px] text-slate-500">
                {club
                  ? 'Powered by ClubStand'
                  : 'One portal for every club you run.'}
              </span>
            </span>
          </Link>
        </div>

        {/* RIGHT SIDE — AUTH */}
        <nav className="flex items-center gap-3 text-sm">
          {!initialised ? (
            <span className="text-xs text-slate-400">Loading…</span>
          ) : user ? (
            <>
              <span className="hidden sm:inline text-xs text-slate-500">
                Signed in as{' '}
                <span className="font-mono text-slate-700">
                  {user.email}
                </span>
              </span>

              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md border text-xs sm:text-sm"
                style={{ borderColor: secondary }}
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md text-white text-xs sm:text-sm"
                style={{ background: primary }}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-md border text-xs sm:text-sm"
                style={{ borderColor: secondary }}
              >
                Log In
              </Link>

              <Link
                href="/signup"
                className="px-3 py-1.5 rounded-md text-white text-xs sm:text-sm"
                style={{ background: primary }}
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
