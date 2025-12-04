// app/admin/clubs/[clubId]/members/[memberId]/page.tsx

import MemberAdminClient from "./MemberAdminClient";

type RouteParams = {
  clubId: string;
  memberId: string;
};

type PageProps = {
  params: Promise<RouteParams>;
};

export default async function MemberAdminPage({ params }: PageProps) {
  // Same pattern as your other pages – params is a Promise
  const resolvedParams = await params;
  const { clubId, memberId } = resolvedParams;

  if (!clubId || !memberId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">
          Member admin
        </h1>
        <p className="mt-4 text-sm text-red-600">
          Missing club or member ID in the URL.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <MemberAdminClient clubId={clubId} memberId={memberId} />
    </div>
  );
}
