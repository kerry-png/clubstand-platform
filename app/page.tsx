// app/page.tsx
export default function HomePage() {
  return (
    <div className="grid gap-8 md:grid-cols-[2fr,1.2fr] items-start">
      <section className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          One membership portal for every club you run.
        </h1>
        <p className="text-sm md:text-base text-slate-600 max-w-xl">
          Manage players, households, teams, payments and permissions across
          multiple clubs — all from a single ClubStand Membership Portal.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Open portal
          </a>
          <a
            href="/admin"
            className="inline-flex items-center justify-center rounded-full border px-5 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Go to club admin
          </a>
        </div>

        <div className="grid gap-3 text-xs text-slate-600 md:grid-cols-3 mt-4">
          <div className="rounded-lg border bg-white p-3">
            <div className="font-medium text-slate-900 text-sm">
              Multi-club architecture
            </div>
            <p className="mt-1">
              Each club has its own branding, domains and configuration — but
              you oversee everything centrally.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <div className="font-medium text-slate-900 text-sm">
              Households & members
            </div>
            <p className="mt-1">
              Link juniors and guardians, handle family billing and keep all
              contact data in one place.
            </p>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <div className="font-medium text-slate-900 text-sm">
              Payments & plans
            </div>
            <p className="mt-1">
              Stripe Connect, membership plans, renewals and payment history per
              member and household.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Quick portal snapshot</h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border bg-slate-50 p-3">
            <div className="text-[11px] text-slate-500">Active clubs</div>
            <div className="mt-1 text-2xl font-semibold">0</div>
            <div className="mt-1 text-[11px] text-slate-500">
              We’ll populate this from Supabase shortly.
            </div>
          </div>
          <div className="rounded-xl border bg-slate-50 p-3">
            <div className="text-[11px] text-slate-500">Active members</div>
            <div className="mt-1 text-2xl font-semibold">0</div>
            <div className="mt-1 text-[11px] text-slate-500">
              Member counts will appear here once the schema is wired in.
            </div>
          </div>
          <div className="rounded-xl border bg-slate-50 p-3">
            <div className="text-[11px] text-slate-500">
              Pending subscriptions
            </div>
            <div className="mt-1 text-2xl font-semibold">0</div>
          </div>
          <div className="rounded-xl border bg-slate-50 p-3">
            <div className="text-[11px] text-slate-500">
              Teams across all clubs
            </div>
            <div className="mt-1 text-2xl font-semibold">0</div>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          This is just mocked data for now — once we’ve created the Supabase
          schema and client, these tiles will be live.
        </p>
      </section>
    </div>
  );
}
