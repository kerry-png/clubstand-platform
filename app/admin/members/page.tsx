// app/admin/members/page.tsx
import { supabaseServerClient } from "@/lib/supabaseServer";

type MemberRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  member_type: string;
  status: string;
  created_at: string;
};

async function getMembers() {
  const { data, error } = await supabaseServerClient
    .from("members")
    .select("id, first_name, last_name, email, member_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return { members: data ?? [], error };
}

export default async function AdminMembersPage() {
  const { members, error } = await getMembers();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Members</h1>
      <p className="text-sm text-slate-600 max-w-xl">
        This page is now reading live from your Supabase <code>members</code> table.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Error loading members: {error.message}
        </div>
      )}

      {members.length === 0 ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
          <p>No members found yet.</p>
          <p className="mt-1">Add a member in Supabase and this table will update automatically.</p>
        </div>
      ) : (
        <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2 border-b">Name</th>
              <th className="px-3 py-2 border-b">Email</th>
              <th className="px-3 py-2 border-b">Type</th>
              <th className="px-3 py-2 border-b">Status</th>
              <th className="px-3 py-2 border-b">Created</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m: MemberRow) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-3 py-2 border-b">
                  {m.first_name} {m.last_name}
                </td>
                <td className="px-3 py-2 border-b text-xs text-slate-600">
                  {m.email ?? <span className="text-slate-400 italic">—</span>}
                </td>
                <td className="px-3 py-2 border-b">{m.member_type}</td>
                <td className="px-3 py-2 border-b">{m.status}</td>
                <td className="px-3 py-2 border-b text-xs text-slate-500">
                  {new Date(m.created_at).toLocaleDateString("en-GB")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
