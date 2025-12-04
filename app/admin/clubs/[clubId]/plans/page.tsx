// app/admin/clubs/[clubId]/plans/page.tsx

import MembershipPlansClient from './MembershipPlansClient';

type PageProps = {
  params: Promise<{ clubId: string }>;
};

export default async function ClubMembershipPlansPage({ params }: PageProps) {
  // In Next 16, params is a Promise for dynamic routes – unwrap it:
  const { clubId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Membership plans</h1>
        <p className="text-sm text-slate-600">
          Configure how this club&apos;s membership plans are priced and
          linked to Stripe. You can enable annual and/or monthly billing
          per plan.
        </p>
      </div>

      <MembershipPlansClient clubId={clubId} />
    </div>
  );
}
