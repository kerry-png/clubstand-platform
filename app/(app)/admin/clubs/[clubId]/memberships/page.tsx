// app/(app)/admin/clubs/[clubId]/memberships/page.tsx

import { getCurrentAdminForClub } from "@/lib/admins";
import { canViewDashboard } from "@/lib/permissions";
import MembershipsClient from "./MembershipsClient";

type PageParams = {
  clubId: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function Page({ params }: PageProps) {
  const { clubId } = await params;

  const admin = await getCurrentAdminForClub(null as any, clubId);
  if (!admin || !canViewDashboard(admin)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">Memberships</h1>
        <p className="mt-2 text-sm text-slate-600">
          You do not have permission to view memberships for this club.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <MembershipsClient clubId={clubId} />
    </div>
  );
}
