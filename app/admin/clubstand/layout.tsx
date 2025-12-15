// app/admin/clubstand/layout.tsx
import type { ReactNode } from 'react';
import Link from 'next/link';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';

export default async function ClubStandAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePlatformAdmin({ redirectTo: '/admin/clubstand' });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white text-sm font-semibold"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              CS
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">ClubStand Admin</div>
              <div className="text-xs text-slate-500">Platform operator</div>
            </div>
          </div>

          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/admin"
              className="rounded-md border px-3 py-1.5 text-xs"
            >
              Back to club admin
            </Link>
            <Link
              href="/admin/clubstand/clubs"
              className="rounded-md px-3 py-1.5 text-xs text-white"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Clubs
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
