// app/admin/members/page.tsx
export default function AdminMembersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Members</h1>
      <p className="text-sm text-slate-600 max-w-xl">
        This will show a searchable, filterable table of members for the
        currently selected club. We&apos;ll hook it up to the{" "}
        <code>members</code> and <code>households</code> tables in Supabase.
      </p>

      <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        <p>
          For now, this is just a placeholder. Once the schema is applied in
          Supabase, we&apos;ll:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>Fetch members for the selected club.</li>
          <li>Show status (active, prospect, lapsed, etc.).</li>
          <li>Show links to households and guardians.</li>
          <li>Add filters by team, age group and membership plan.</li>
        </ul>
      </div>
    </div>
  );
}
