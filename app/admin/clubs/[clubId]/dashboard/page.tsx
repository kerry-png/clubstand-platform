// app/admin/clubs/[clubId]/dashboard/page.tsx

import ClubDashboardClient from './ClubDashboardClient';

type PageParams = {
  clubId: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function ClubDashboardPage({ params }: PageProps) {
  // Next 16: params is a Promise – follow the same pattern as household page
  const resolvedParams = await params;
  const clubId = resolvedParams.clubId;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Club dashboard
          </h1>
          <p className="text-sm text-slate-600">
            Membership stats, junior breakdown, safeguarding flags and key
            indicators for this club.
          </p>
        </div>
      </div>

      <ClubDashboardClient clubId={clubId} />
    </div>
  );
}
