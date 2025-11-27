// app/household/[householdId]/edit/page.tsx

import { supabaseServerClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import EditHouseholdForm from './EditHouseholdForm';

type PageParams = {
  householdId: string;
};

type PageProps = {
  params: Promise<PageParams>;
};

export default async function EditHouseholdPage(props: PageProps) {
  const supabase = supabaseServerClient;

  const resolvedParams = await props.params;
  const householdId = resolvedParams.householdId;

  if (!householdId || householdId === 'undefined') {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <h1 className="text-xl font-semibold mb-2">Household not available</h1>
        <p className="text-sm text-red-700">
          No valid household id was provided in the URL.
        </p>
      </div>
    );
  }

  const { data: household, error } = await supabase
    .from('households')
    .select(
      `
        id,
        name,
        primary_email,
        phone,
        address_line1,
        address_line2,
        town_city,
        postcode
      `,
    )
    .eq('id', householdId)
    .single();

  if (error || !household) {
    console.error('Edit household load error', error);
    return notFound();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Edit household details</h1>
      <p className="text-sm text-gray-600">
        These contact details are used by the club to stay in touch with your
        household about memberships, teams and payments.
      </p>

      <EditHouseholdForm
        householdId={household.id}
        initialValues={{
          name: household.name ?? '',
          primary_email: household.primary_email ?? '',
          phone: household.phone ?? '',
          address_line1: household.address_line1 ?? '',
          address_line2: household.address_line2 ?? '',
          town_city: household.town_city ?? '',
          postcode: household.postcode ?? '',
        }}
      />
    </div>
  );
}
