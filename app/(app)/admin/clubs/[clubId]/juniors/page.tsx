// app/admin/clubs/[clubId]/juniors/page.tsx

import JuniorsDashboardClient from "./JuniorsDashboardClient";
import AccessDenied from "@/app/admin/components/AccessDenied";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canViewJuniors } from "@/lib/permissions";

type PageParams = {
  clubId: string;
};

type PageProps = {
  // Next.js 16: params may be a plain object or a Promise
  params: PageParams | Promise<PageParams>;
};

export default async function JuniorsPage({ params }: PageProps) {
  // Unwrap params safely for both object/Promise cases
  const resolvedParams =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<PageParams>)
      : (params as PageParams);

  const { clubId } = resolvedParams;

  // We don't have a real Request object here, so pass null.
  // The permission helper handles null + PERMISSIONS_DISABLED.
  const admin = await getCurrentAdminForClub(null as any, clubId);

  // IMPORTANT: only check canViewJuniors, don't add "!admin".
  if (!canViewJuniors(admin)) {
    return (
      <AccessDenied
        clubName="Rainhill Cricket Club" // can be made dynamic later
        clubId={clubId}
        message="You don't have permission to view the juniors dashboard."
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Juniors dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Junior players by age band, gender and safeguarding flags.
          </p>
        </div>
      </div>

      <JuniorsDashboardClient clubId={clubId} />
    </div>
  );
}
