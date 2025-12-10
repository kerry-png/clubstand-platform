// app/admin/clubs/[clubId]/members/page.tsx

import { supabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canManageMembers } from "@/lib/permissions";
import MembersTable from "./MembersTable";

type PageParams = {
  clubId: string;
};

type PageProps = {
  params: PageParams | Promise<PageParams>;
};

export default async function MembersPage({ params }: PageProps) {
  // Next 16: params may be a Promise
  const resolved =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<PageParams>)
      : (params as PageParams);

  const { clubId } = resolved;

  // Permission check (respects PERMISSIONS_DISABLED)
  const admin = await getCurrentAdminForClub(null as any, clubId);
  if (!canManageMembers(admin)) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Members</h1>
        <p className="text-sm text-slate-600">
          You do not have permission to manage members for this club.
        </p>
      </div>
    );
  }

  const { data: members, error } = await supabaseServerClient
    .from("members")
    .select(
      `id, first_name, last_name, gender, member_type, status, date_of_birth,
       is_county_player, is_district_player`
    )
    .eq("club_id", clubId)
    .order("last_name")
    .order("first_name");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Members</h1>
        <p className="text-sm text-slate-600">
          View and manage all members at this club.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-600">
          Failed to load members: {error.message}
        </p>
      )}

      <MembersTable members={members ?? []} clubId={clubId} />
    </div>
  );
}
