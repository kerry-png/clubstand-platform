// app/(app)/admin/clubs/[clubId]/membership-setup/page.tsx
import MembershipSetupClient from './MembershipSetupClient';
type Props = { params: Promise<{ clubId: string }> };
export default async function MembershipSetupPage({ params }: Props) {
  const { clubId } = await params;
  return <MembershipSetupClient clubId={clubId} />;
}
