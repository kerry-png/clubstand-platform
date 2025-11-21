// app/admin/teams/page.tsx
export default function AdminTeamsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Teams</h1>
      <p className="text-sm text-slate-600 max-w-xl">
        This area will manage teams per club, squad lists and multi-team
        membership (e.g. U13s, U15s, Women&apos;s XI, 1st XI, 2nd XI).
      </p>

      <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        <p>
          Once we&apos;ve created the <code>teams</code> and{" "}
          <code>team_members</code> tables, we&apos;ll:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>List all teams for the current club.</li>
          <li>Allow adding/removing members to teams.</li>
          <li>Support different formats (junior, women&apos;s, senior, social).</li>
          <li>Respect per-club naming (e.g. &quot;All Stars&quot;, &quot;T20&quot;).</li>
        </ul>
      </div>
    </div>
  );
}
