// app/page.tsx

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl flex-col gap-10 px-4 py-10 md:px-8 md:py-12">
      {/* Hero + key features */}
      <section className="grid items-start gap-10 lg:grid-cols-[1.4fr,1fr]">
        <div className="space-y-5">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            One membership portal for every club you run.
          </h1>
          <p className="max-w-xl text-sm text-slate-600 md:text-base">
            Manage players, households, teams, payments and permissions across
            multiple clubs — all from a single ClubStand Membership Portal.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              Open portal
            </a>
            <a
              href="/admin"
              className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Go to club admin
            </a>
          </div>

          <p className="text-xs text-slate-500">
            Use this portal to onboard new clubs, configure membership plans for
            each one, and keep all your members and payments in one place.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Multi-club architecture
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Each club has its own branding, domains and configuration — but
              you oversee everything centrally from ClubStand.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Households &amp; members
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Link juniors and guardians, handle family billing and keep all
              contact data in one place.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Payments &amp; plans
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              Stripe-powered membership plans, renewals, instalments and payment
              history per member and household.
            </p>
          </div>
        </div>
      </section>

      {/* Quick portal snapshot */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Quick portal snapshot
          </h2>
          <span className="text-[11px] text-slate-500">
            Example metrics – will be wired to Supabase.
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-[11px] text-slate-500">Active clubs</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">0</div>
            <p className="mt-2 text-[11px] text-slate-500">
              We’ll populate this from Supabase once the live schema is ready.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-[11px] text-slate-500">Active members</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">0</div>
            <p className="mt-2 text-[11px] text-slate-500">
              Member counts across all clubs in your portal.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-[11px] text-slate-500">
              Pending subscriptions
            </div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">0</div>
            <p className="mt-2 text-[11px] text-slate-500">
              New sign-ups that have not yet completed payment.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-[11px] text-slate-500">Teams across clubs</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">0</div>
            <p className="mt-2 text-[11px] text-slate-500">
              As you add age groups and teams, they’ll appear here.
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          This is just mocked data for now — once the Supabase schema and
          client are in place, these tiles will be powered by live club data.
        </p>
      </section>
    </div>
  );
}
