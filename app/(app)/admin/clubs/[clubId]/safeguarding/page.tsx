// app/admin/clubs/[clubId]/safeguarding/page.tsx

import SafeguardingQuestionsClient from './SafeguardingQuestionsClient';

type PageProps = {
  params: Promise<{ clubId: string }>;
};

export default async function ClubSafeguardingPage({
  params,
}: PageProps) {
  // Next 16: params is a Promise
  const { clubId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">
          Safeguarding & consent questions
        </h1>
        <p className="text-sm text-slate-600">
          Configure the safeguarding, consent and policy questions that
          members and parents must complete before memberships become
          active. These questions will appear in the onboarding wizard
          and in member dashboards.
        </p>
      </div>

      <SafeguardingQuestionsClient clubId={clubId} />
    </div>
  );
}
