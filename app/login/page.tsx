// app/login/page.tsx
export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
      <p className="text-sm text-slate-600">
        This will become your Supabase-powered login (magic link or email +
        password). For now, it&apos;s just a placeholder.
      </p>

      <form className="space-y-3">
        <div className="space-y-1 text-sm">
          <label htmlFor="email" className="block text-slate-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            disabled
            className="w-full rounded-md border px-3 py-2 text-sm bg-slate-50 text-slate-500"
            placeholder="Coming soon…"
          />
        </div>
        <button
          type="button"
          disabled
          className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white opacity-40"
        >
          Magic link login coming soon
        </button>
      </form>
    </div>
  );
}
