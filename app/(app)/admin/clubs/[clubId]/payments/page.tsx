// app/admin/clubs/[clubId]/payments/page.tsx

import { getCurrentAdminForClub } from "@/lib/admins";
import { canViewPayments } from "@/lib/permissions";
import PaymentsClient from "./PaymentsClient";

type PageParams = {
  clubId: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function PaymentsPage({ params }: PageProps) {
  // Next 16: params is a Promise
  const { clubId } = await params;

  // --- Permission check ---
  const admin = await getCurrentAdminForClub(null as any, clubId);

  if (!admin || !canViewPayments(admin)) {
    // Layout (ClubAdminShell) still wraps this page via layout.tsx
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>
        <p className="mt-2 text-sm text-slate-600">
          You do not have permission to view payments for this club.
        </p>
      </div>
    );
  }

  // Normal case: just render inner content; layout provides shell + sidebar
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PaymentsClient clubId={clubId} />
    </div>
  );
}
