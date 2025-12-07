// app/admin/clubs/[clubId]/members/page.tsx

type PageParams = {
  clubId: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function MembersPage({ params }: PageProps) {
  const { clubId } = await params;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Members
          </h1>
          <p className="text-sm text-slate-600">
            Manage club members.
          </p>
        </div>
      </div>
    </div>
  );
}
