// app/(marketing)/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--club-primary, #2563eb), var(--club-accent, #22c55e))",
              }}
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold">ClubStand</div>
              <div className="text-xs text-slate-500">
                Memberships made calmer
              </div>
            </div>
          </div>

          <Link
            href="#interest"
            className="rounded-xl px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: "var(--club-primary, #2563eb)" }}
          >
            Register interest
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Running a club shouldn’t mean spreadsheets, chasing payments,
              and holding sensitive data in emails.
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              ClubStand is a calm membership and payments platform built
              specifically for grassroots clubs.
              Parents manage their own details. Treasurers see what’s paid.
              Committees spend less time on admin.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="#interest"
                className="rounded-xl px-6 py-3 text-sm font-medium text-white shadow-sm"
                style={{ backgroundColor: "var(--club-primary, #2563eb)" }}
              >
                Register interest
              </Link>

              <p className="text-sm text-slate-500">
                A short conversation to see if it’s right for your club.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Relief section */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold">
            Built for volunteer-run clubs
          </h2>

          <p className="mt-3 max-w-2xl text-slate-600">
            ClubStand was built by people who understand the reality of
            grassroots sport — limited time, shared responsibility,
            and the need to keep things simple and safe.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Outcome text="Stop chasing membership payments" />
            <Outcome text="Keep safeguarding and medical info in one secure place" />
            <Outcome text="Let parents update their own details" />
            <Outcome text="See who’s active, lapsed or unpaid at a glance" />
            <Outcome text="Handle family and household memberships properly" />
            <Outcome text="Give treasurers, coaches and safeguarding officers the right access" />
          </div>
        </div>
      </section>

      {/* Payments reassurance */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
            <h3 className="text-lg font-semibold">Online payments, done properly</h3>
            <p className="mt-3 text-slate-600">
              Clubs take payments through their own Stripe account —
              the same secure system used by thousands of UK organisations.
              Setup is done once, and funds go directly to the club.
            </p>
          </div>
        </div>
      </section>

      {/* Interest */}
      <section id="interest" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold">
                Interested in using ClubStand?
              </h2>

              <p className="mt-3 max-w-xl text-slate-600">
                If you’re a club secretary, treasurer or volunteer and
                want a calmer way to run memberships, leave your details
                and we’ll take it from there.
              </p>

              <p className="mt-4 text-sm text-slate-500">
                No sales pressure. No obligation.
              </p>
            </div>

            <form
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
              action="mailto:hello@clubstand.co.uk"
              method="post"
              encType="text/plain"
            >
              <Field label="Club name" name="Club name" />
              <Field label="Your name" name="Name" />
              <Field label="Email" name="Email" type="email" />
              <Field label="Your role" name="Role" />

              <button
                type="submit"
                className="w-full rounded-xl px-5 py-3 text-sm font-medium text-white"
                style={{ backgroundColor: "var(--club-primary, #2563eb)" }}
              >
                Register interest
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-slate-500">
          Built in the UK for grassroots sports clubs.
        </div>
      </footer>
    </main>
  );
}

function Outcome({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
      {text}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none"
      />
    </label>
  );
}
