// app/admin/clubstand/page.tsx
import Link from 'next/link';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';

export default async function ClubStandAdminHome() {
  await requirePlatformAdmin({ redirectTo: '/admin/clubstand' });

  return (
    <div className="space-y-4">
      <h1
        className="text-2xl font-semibold"
        style={{ color: 'var(--brand-primary)' }}
      >
        ClubStand operator admin
      </h1>

      <p className="text-sm text-slate-700">
        Manage clubs, branding, Stripe onboarding and platform settings.
      </p>

      <div className="flex gap-2">
        <Link
          href="/admin/clubstand/clubs"
          className="rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          Manage clubs
        </Link>

        <Link
          href="/admin"
          className="rounded-md border px-4 py-2 text-sm font-semibold"
        >
          Go to club admin
        </Link>
      </div>
    </div>
  );
}
