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
  const [isClubAdmin, setIsClubAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error) setUser(data.user ?? null);
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

  useEffect(() => {
    let cancelled = false;

    async function loadNavFlags() {
      if (!user) {
        setIsClubAdmin(false);
        return;
      }

      try {
        const res = await fetch('/api/me/nav', { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setIsClubAdmin(Boolean(json?.isClubAdmin));
      } catch {
        // ignore
      }
    }

    loadNavFlags();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();

    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }

    window.location.href = '/';
  };

  const logoUrl = branding?.logoUrl ?? null;

  const fallbackInitials = (() => {
    const text = club?.short_name ?? club?.name ?? 'CS';
    return text
      .split(/\s+/)
      .map((w: string) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  })();

  const primary = 'var(--brand-primary)';
  const secondary = 'var(--brand-secondary)';

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* LEFT — BRAND */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
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

            <span className="flex flex-col leading-tight">
              <span className="font-semibold text-sm" style={{ color: primary }}>
                {club?.name ?? 'ClubStand'}
              </span>
              <span className="text-[11px] text-slate-500">
                {club ? 'Powered by ClubStand' : 'One portal for every club you run.'}
              </span>
            </span>
          </Link>
        </div>

        {/* RIGHT — NAV */}
        <nav className="flex items-center gap-2 text-sm">
          {!initialised ? (
            <span className="text-xs text-slate-400">Loading…</span>
          ) : user ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/household"
                  className="px-3 py-1.5 rounded-full border text-xs sm:text-sm"
                  style={{ borderColor: secondary }}
                >
                  My household
                </Link>

                {isClubAdmin && (
                  <Link
                    href="/admin"
                    className="px-3 py-1.5 rounded-full border text-xs sm:text-sm"
                    style={{ borderColor: secondary }}
                  >
                    Club admin
                  </Link>
                )}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-full text-white text-xs sm:text-sm"
                style={{ background: primary }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-full border text-xs sm:text-sm"
                style={{ borderColor: secondary }}
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className="px-3 py-1.5 rounded-full text-white text-xs sm:text-sm"
                style={{ background: primary }}
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
