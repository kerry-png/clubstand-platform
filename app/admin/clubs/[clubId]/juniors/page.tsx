// app/admin/clubs/[clubId]/juniors/page.tsx

import JuniorsDashboardClient from "./JuniorsDashboardClient";

type PageParams = {
  clubId: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function JuniorsPage({ params }: PageProps) {
  // ✅ params IS a Promise in this environment → must await
  const { clubId } = await params;

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

      {/* ✅ Correctly pass clubId to the client component */}
      <JuniorsDashboardClient clubId={clubId} />
    </div>
  );
}
