// components/NavBar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type User = {
  email?: string | null;
};

export default function NavBar() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Get current user on first load
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

    // Listen for login / logout / token refresh
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
    // Sign out on the client so auth state updates immediately
    await supabase.auth.signOut();
    // Also hit the server route to clear any server-side state / cookies
    try {
      await fetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    // Then send them home
    window.location.href = '/';
  };

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: brand / home */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-white text-sm font-semibold">
              CS
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-semibold text-sm">
                ClubStand Membership
              </span>
              <span className="text-[11px] text-slate-500">
                One portal for every club you run.
              </span>
            </span>
          </Link>
        </div>

        {/* Right: auth-aware links */}
        <nav className="flex items-center gap-3 text-sm">
          {!initialised ? (
            // Tiny placeholder so things don't jump about; optional
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
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md bg-black text-white text-xs sm:text-sm"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-md border text-xs sm:text-sm"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 rounded-md bg-black text-white text-xs sm:text-sm"
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
