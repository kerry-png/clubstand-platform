// app/admin/clubs/[clubId]/dashboard/page.tsx

import AccessDenied from "@/app/admin/components/AccessDenied";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canViewDashboard } from "@/lib/permissions";
import DashboardClient from "./DashboardClient";

type PageParams = {
  clubId: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function ClubDashboardPage({ params }: PageProps) {
  // Next 16: params is a Promise
  const { clubId } = await params;

  const admin = await getCurrentAdminForClub(null as any, clubId);

  if (!admin || !canViewDashboard(admin)) {
    return (
      <AccessDenied
        clubId={clubId}
        clubName="Rainhill Cricket Club" // can make dynamic later if you like
        message="You do not have permission to view this dashboard."
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">
            At-a-glance overview of members, juniors and safeguarding for this
            club.
          </p>
        </div>
      </header>

      <DashboardClient clubId={clubId} />
    </div>
  );
}
