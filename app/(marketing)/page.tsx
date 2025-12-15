// app/(marketing)/page.tsx
import Link from "next/link";

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Top bar */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--club-primary, #2563eb), var(--club-accent, #22c55e))",
                opacity: 0.9,
              }}
              aria-hidden
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold">ClubStand</div>
              <div className="text-xs text-slate-500">Memberships & payments for clubs</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <Link
              href="#features"
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              How it works
            </Link>
            <Link
              href="#pricing"
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Pricing
            </Link>
            <Link
              href="#interest"
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Register interest
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                Built for grassroots clubs • GDPR-friendly • Less admin
              </p>

              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                Memberships, payments and safeguarding —{" "}
                <span
                  style={{ color: "var(--club-primary, #2563eb)" }}
                >
                  sorted
                </span>
                .
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                ClubStand helps clubs manage households, members, and subscriptions without
                spreadsheets, inbox chaos, or chasing payments. Parents can update details anytime,
                and clubs get clear dashboards with online payments through the club’s own Stripe
                account.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="#interest"
                  className="rounded-xl px-5 py-3 text-sm font-medium text-white shadow-sm"
                  style={{
                    backgroundColor: "var(--club-primary, #2563eb)",
                  }}
                >
                  Register interest
                </Link>

                <Link
                  href="#how-it-works"
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  See how it works
                </Link>

                <p className="text-xs text-slate-500">
                  No pressure. Early clubs get hands-on setup support.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Stat label="Less chasing" value="Automated renewals" />
                <Stat label="Safer data" value="Keep info in one place" />
                <Stat label="Faster admin" value="Households & roles" />
              </div>
            </div>

            {/* Soft “product preview” placeholder */}
            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Club dashboard</div>
                  <div className="text-xs text-slate-500">Preview</div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Card title="Members" body="Active, lapsed, pending — at a glance." />
                  <Card title="Juniors" body="Age groups, safeguarding flags, photo consent." />
                  <Card title="Payments" body="Subscriptions, failures, and reminders." />
                  <Card title="Admin roles" body="Treasurer / coaches / safeguarding access." />
                </div>

                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">
                    “Built to reduce volunteer admin — and keep safeguarding data out of inboxes.”
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Pilot club: Rainhill CC</p>
                </div>
              </div>

              <div
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-15 blur-2xl"
                style={{ backgroundColor: "var(--club-accent, #22c55e)" }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -left-6 -bottom-6 h-24 w-24 rounded-full opacity-15 blur-2xl"
                style={{ backgroundColor: "var(--club-primary, #2563eb)" }}
                aria-hidden
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight">What clubs use ClubStand for</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Everything you need for membership admin and payments in one place — designed for
            volunteer-run clubs.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              title="Households & members"
              body="Add adults and juniors, manage details, and keep everything organised by household."
            />
            <Feature
              title="Safeguarding data in one place"
              body="Emergency contacts, medical notes, photo consent and more — securely stored and easy to update."
            />
            <Feature
              title="Online payments & subscriptions"
              body="Membership fees via the club’s own Stripe account — with clear status tracking."
            />
            <Feature
              title="Admin dashboards"
              body="At-a-glance stats for memberships, juniors, and payment health."
            />
            <Feature
              title="Roles & visibility"
              body="Give the right people access to the right areas (treasurer, safeguarding, coaches)."
            />
            <Feature
              title="Rules-based pricing"
              body="Household caps, bundles, and multi-member discounts — without messy workarounds."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-slate-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Step n="1" title="Set up your club" body="Branding, plans and pricing rules." />
            <Step n="2" title="Connect Stripe" body="One-off setup (usually the treasurer)." />
            <Step n="3" title="Members join online" body="Household details and consent captured." />
            <Step n="4" title="Run the season" body="Track status, payments and safeguarding easily." />
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold">About Stripe</h3>
            <p className="mt-2 text-sm text-slate-600">
              Online payments require a one-off Stripe verification step. This is a standard
              requirement for any organisation taking card payments online. Funds go directly to
              the club’s Stripe account.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing (simple v1) */}
      <section id="pricing" className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Simple per-club pricing. No per-member surprises. Early clubs can request a pilot period.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <PriceCard
              title="Pilot club"
              price="£0"
              note="Limited availability"
              bullets={[
                "Hands-on setup support",
                "Early feature feedback",
                "Great fit for first movers",
              ]}
            />
            <PriceCard
              title="Standard"
              price="From £29 / month"
              note="Per club"
              bullets={[
                "Memberships & households",
                "Safeguarding data management",
                "Stripe payments & subscriptions",
              ]}
              highlight
            />
            <PriceCard
              title="Custom"
              price="Let’s talk"
              note="For larger clubs"
              bullets={[
                "Custom onboarding",
                "Multi-section structures",
                "Advanced reporting needs",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Interest form */}
      <section id="interest" className="border-t border-slate-100 bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Register interest</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                If you’re a club admin or volunteer and want a calmer way to manage memberships and
                payments, leave your details and we’ll get back to you.
              </p>

              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                <li>• You can run a pilot before going fully live.</li>
                <li>• We’ll help you set up plans, pricing and Stripe.</li>
                <li>• No heavy sales — just practical onboarding.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <form
                className="space-y-4"
                // v1: mailto. Later: swap to an API route storing in Supabase.
                action="mailto:hello@clubstand.co.uk"
                method="post"
                encType="text/plain"
              >
                <Field label="Club name" name="Club name" placeholder="e.g. Rainhill Cricket Club" />
                <Field label="Your name" name="Name" placeholder="Your name" />
                <Field label="Email" name="Email" type="email" placeholder="you@club.com" />
                <Field label="Role" name="Role" placeholder="Treasurer, Secretary, Juniors, etc." />
                <Field
                  label="Notes (optional)"
                  name="Notes"
                  placeholder="What are you trying to fix? Admin workload, payments, safeguarding…"
                  textarea
                />

                <button
                  type="submit"
                  className="w-full rounded-xl px-5 py-3 text-sm font-medium text-white shadow-sm"
                  style={{ backgroundColor: "var(--club-primary, #2563eb)" }}
                >
                  Send
                </button>

                <p className="text-xs text-slate-500">
                  We’ll only use this to contact you about ClubStand.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-slate-500">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} ClubStand</p>
            <div className="flex gap-4">
              <Link className="hover:text-slate-700" href="#interest">
                Contact
              </Link>
              <Link className="hover:text-slate-700" href="#features">
                Features
              </Link>
              <Link className="hover:text-slate-700" href="#pricing">
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-slate-600">{body}</div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div
        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: "var(--club-primary, #2563eb)" }}
      >
        {n}
      </div>
      <div className="mt-3 text-sm font-semibold">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function PriceCard({
  title,
  price,
  note,
  bullets,
  highlight,
}: {
  title: string;
  price: string;
  note: string;
  bullets: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-6 ${
        highlight ? "border-slate-300 shadow-sm" : "border-slate-200"
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{price}</div>
      <div className="mt-1 text-xs text-slate-500">{note}</div>
      <ul className="mt-5 space-y-2 text-sm text-slate-600">
        {bullets.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>
      <Link
        href="#interest"
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
      >
        Register interest
      </Link>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  textarea,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          placeholder={placeholder}
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none"
        />
      )}
    </label>
  );
}
