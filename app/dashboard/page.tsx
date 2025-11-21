// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-slate-600 max-w-xl">
        This is your cross-club view. In the next steps we’ll pull in real data
        from Supabase for your clubs, members, teams and memberships.
      </p>

      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-slate-500 uppercase mb-1">
            Your clubs
          </div>
          <div className="text-3xl font-semibold">0</div>
          <p className="mt-1 text-xs text-slate-500">
            Once we seed Rainhill CC, it will appear here.
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-slate-500 uppercase mb-1">
            Members across clubs
          </div>
          <div className="text-3xl font-semibold">0</div>
          <p className="mt-1 text-xs text-slate-500">
            We’ll query the <code>members</code> table here.
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-slate-500 uppercase mb-1">
            Active subscriptions
          </div>
          <div className="text-3xl font-semibold">0</div>
          <p className="mt-1 text-xs text-slate-500">
            This will come from the membership subscription tables.
          </p>
        </div>
      </div>
    </div>
  );
}