//app/admin/clubs/[clubId]/settings/admins/page.tsx
import AdminsClient from "./AdminsClient";

type PageParams = {
  clubId: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function AdminsPage({ params }: PageProps) {
  // Next 16: params is a Promise in this env – same pattern as dashboard/juniors
  const { clubId } = await params;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Admins &amp; roles
        </h1>
        <p className="text-sm text-slate-600">
          Manage which users can administer this club and configure their
          permissions.
        </p>
      </div>

      <AdminsClient clubId={clubId} />
    </div>
  );
}
