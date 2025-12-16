//app/admin/clubs/[clubId]/pricing/rules/page.tsx
import PricingRulesClient from "./PricingRulesClient";

type PageProps = {
  params: Promise<{ clubId: string }>;
};

export default async function PricingRulesPage({ params }: PageProps) {
  const { clubId } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Pricing rules</h1>
        <p className="text-sm text-slate-600">
          Automatic rules that adjust household pricing (caps, multi-member discounts, bundles).
          Discount codes are separate.
        </p>
      </div>

      <PricingRulesClient clubId={clubId} />
    </div>
  );
}
