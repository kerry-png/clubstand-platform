import InvitationsClient from './InvitationsClient';

type PageProps = {
  params: Promise<{ clubId: string }>;
};

export default async function InvitationsPage({ params }: PageProps) {
  const { clubId } = await params;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New household invitations</h1>
        <p className="mt-1 text-sm text-slate-600">
          Invite an approved household that does not already have a ClubStand record.
        </p>
      </div>

      <InvitationsClient clubId={clubId} />
    </div>
  );
}
