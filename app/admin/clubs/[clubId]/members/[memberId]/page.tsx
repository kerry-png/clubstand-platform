// app/admin/clubs/[clubId]/members/[memberId]/page.tsx

import MemberAdminClient from "./MemberAdminClient";
import { getCurrentAdminForClub } from "@/lib/admins";
import { canManageMembers, canViewPayments } from "@/lib/permissions";

type PageParams = {
  clubId: string;
  memberId: string;
};

type PageProps = {
  params: Promise<PageParams> | PageParams;
};

export default async function MemberAdminPage({ params }: PageProps) {
  // Next.js 16: params may be a Promise
  const resolved = await (params as Promise<PageParams>);
  const { clubId, memberId } = resolved;

  // Load admin row for this club
  const admin = await getCurrentAdminForClub(null, clubId);

  const canManage = canManageMembers(admin);
  const canViewPay = canViewPayments(admin);

  return (
    <MemberAdminClient
      clubId={clubId}
      memberId={memberId}
      canManageMembers={canManage}
      canViewPayments={canViewPay}
    />
  );
}
