// app/admin/page.tsx
import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Club admin</h1>
      <p className="text-sm text-slate-600 max-w-xl">
        Admin area for managing clubs, members, teams and membership plans.
        We’ll lock this down to users with a &quot;club_admin&quot; role once
        Supabase auth and RLS are in place.
      </p>

      <div className="grid gap-3 md:grid-cols-3 text-sm">
        <Link
          href="/admin/members"
          className="rounded-xl border bg-white p-4 hover:bg-slate-50"
        >
          <div className="font-medium">Members</div>
          <p className="mt-1 text-xs text-slate-600">
            Search, filter and manage members, households and guardians.
          </p>
        </Link>
        <Link
          href="/admin/teams"
          className="rounded-xl border bg-white p-4 hover:bg-slate-50"
        >
          <div className="font-medium">Teams</div>
          <p className="mt-1 text-xs text-slate-600">
            Create and organise teams per club, assign players and coaches.
          </p>
        </Link>
        <Link
          href="/admin/memberships"
          className="rounded-xl border bg-white p-4 hover:bg-slate-50"
        >
          <div className="font-medium">Membership plans</div>
          <p className="mt-1 text-xs text-slate-600">
            Define membership categories, pricing and billing rules.
          </p>
        </Link>
      </div>
    </div>
  );
}
