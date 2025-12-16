// app/admin/clubs/[clubId]/payments/stripe/page.tsx
import { getCurrentAdminForClub } from '@/lib/admins';
import { canViewPayments } from '@/lib/permissions';
import StripeConnectClient from './StripeConnectClient';

type PageParams = { clubId: string };
type PageProps = { params: Promise<PageParams> };

export default async function StripePage({ params }: PageProps) {
  const { clubId } = await params;

  const admin = await getCurrentAdminForClub(null as any, clubId);
  if (!admin || !canViewPayments(admin)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold text-slate-900">Stripe</h1>
        <p className="mt-2 text-sm text-slate-600">
          You do not have permission to view payments for this club.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <StripeConnectClient clubId={clubId} />
    </div>
  );
}
