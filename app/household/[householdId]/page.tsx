// app/household/[householdId]/page.tsx

import { supabaseServerClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import Link from 'next/link';

type PageParams = {
  householdId: string;
};

type PageProps = {
  params: Promise<PageParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function HouseholdDashboardPage(props: PageProps) {
  const supabase = supabaseServerClient;

  const resolvedParams = await props.params;
  const query = await props.searchParams;

  const householdId = resolvedParams.householdId;

  const setupRaw = query?.setup;
  const isSetup =
    typeof setupRaw === 'string'
      ? setupRaw === '1'
      : Array.isArray(setupRaw)
      ? setupRaw.includes('1')
      : false;

  if (!householdId || householdId === 'undefined') {
    return (
      <div className="max-w-xl mx-auto py-10 px-4">
        <h1 className="text-xl font-semibold mb-2">Household not available</h1>
        <p className="text-sm text-red-700">
          No valid household id was provided in the URL.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          The address should look like:{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
            /household/9074a61b-ce63-4e89-aa3a-5529915a21d2
          </code>
        </p>
      </div>
    );
  }

  // 1) Load household
  const { data: household, error: householdError } = await supabase
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

  if (householdError || !household) {
    console.error('Household load error', householdError);
    return notFound();
  }

  // 2) Load members in this household
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select(
      `
        id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        member_type
      `,
    )
    .eq('household_id', householdId)
    .order('date_of_birth', { ascending: true });

  if (membersError) {
    console.error('Members load error', membersError);
  }

  // 3) Load subscriptions for this household, joined to plans + members
  const { data: subscriptions, error: subsError } = await supabase
    .from('membership_subscriptions')
    .select(
      `
        id,
        status,
        created_at,
        plan:membership_plans (
          id,
          name,
          slug
        ),
        member:members (
          id,
          first_name,
          last_name
        )
      `,
    )
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (subsError) {
    console.error('Subscriptions load error', subsError);
  }

  const pendingCount =
    subscriptions?.filter((s: any) => s.status === 'pending').length ?? 0;
  const activeCount =
    subscriptions?.filter((s: any) => s.status === 'active').length ?? 0;

  const formatMemberType = (member: any) => {
    switch (member.member_type) {
      case 'player':
        return 'Player';
      case 'supporter':
        return 'Social / Supporter';
      case 'coach':
        return 'Coach';
      default:
        return 'Member';
    }
  };

  const fullName = (m: any) => `${m.first_name} ${m.last_name}`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Setup banner (when coming straight from join flow) */}
      {isSetup && (
        <section className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
          <h2 className="font-semibold text-blue-700">Set up your household</h2>
          <p className="text-sm text-blue-700">
            You&apos;ve started a new membership. Add any family members living
            in your household so the club has a complete picture of who this
            membership covers.
          </p>
          <div className="mt-3">
            <Link
              href={`/household/${householdId}/add-member`}
              className="inline-flex px-3 py-1.5 text-sm rounded bg-blue-600 text-white"
            >
              Add family member
            </Link>
          </div>
        </section>
      )}

      {/* Household header */}
      <section className="border rounded-lg p-4 space-y-2 bg-gray-50">
        <h1 className="text-2xl font-semibold">
          {household.name || 'Household'} – Membership Overview
        </h1>

        <p className="text-sm text-gray-700">
          This page shows everyone in your household and their club memberships.
          If anything looks incorrect, please contact the club admin.
        </p>

        <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
          <div>
            <div className="font-medium text-gray-900">Primary e-mail</div>
            <div>{household.primary_email}</div>
          </div>
          {household.phone && (
            <div>
              <div className="font-medium text-gray-900">Phone</div>
              <div>{household.phone}</div>
            </div>
          )}
          {(household.address_line1 ||
            household.town_city ||
            household.postcode) && (
            <div className="sm:col-span-2">
              <div className="font-medium text-gray-900">Address</div>
              <div>
                {household.address_line1 && (
                  <div>{household.address_line1}</div>
                )}
                {household.address_line2 && (
                  <div>{household.address_line2}</div>
                )}
                {(household.town_city || household.postcode) && (
                  <div>
                    {household.town_city}{' '}
                    {household.postcode && `, ${household.postcode}`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Members list */}
      <section className="border rounded-lg p-4 space-y-3">
        <div className="flex items-centre justify-between gap-2">
          <h2 className="text-lg font-semibold">People in this household</h2>

          <div className="flex gap-2">
            <Link
              href={`/household/${householdId}/add-member?type=player`}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              Add player
            </Link>
            
            <Link
              href={`/household/${householdId}/add-member?type=supporter`}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              Add social member
            </Link>
          </div>
        </div>

        {members && members.length > 0 ? (
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-centre justify-between gap-2 border rounded-md px-3 py-2 bg-white"
              >
                <div>
                  <div className="font-medium text-sm">{fullName(m)}</div>
                  <div className="text-xs text-gray-600">
                    {formatMemberType(m)}
                    {m.gender ? ` • ${m.gender}` : ''}
                    {m.date_of_birth ? ` • DOB: ${m.date_of_birth}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    Member
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">
            No members found for this household yet.
          </p>
        )}
      </section>

      {/* Memberships / subscriptions */}
      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="text-lg font-semibold">Memberships &amp; payments</h2>

        {/* Next steps messaging */}
        <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-800 space-y-1">
          {subscriptions && subscriptions.length > 0 ? (
            <>
              {pendingCount > 0 && (
                <p>
                  You have{' '}
                  <span className="font-semibold">
                    {pendingCount} membership
                    {pendingCount > 1 ? 's' : ''} awaiting payment
                  </span>
                  . Your club may send you a payment link or instructions to
                  complete these. Until payment is confirmed, these
                  memberships will stay in &quot;Awaiting payment&quot;.
                </p>
              )}
              {activeCount > 0 && (
                <p>
                  <span className="font-semibold">
                    {activeCount} membership
                    {activeCount > 1 ? 's are' : ' is'} active
                  </span>{' '}
                  for this household. If anything looks wrong, please contact
                  the club.
                </p>
              )}
            </>
          ) : (
            <p>
              No memberships are set up yet for this household. Once a
              membership is created for someone here, it will appear below along
              with its payment status.
            </p>
          )}
        </div>

        {subscriptions && subscriptions.length > 0 ? (
          <div className="space-y-2">
            {subscriptions.map((sub: any) => (
              <div
                key={sub.id}
                className="flex flex-col sm:flex-row sm:items-centre justify-between gap-2 border rounded-md px-3 py-2 bg-white"
              >
                <div>
                  <div className="font-medium text-sm">
                    {sub.plan?.name || 'Membership plan'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {sub.member
                      ? `For: ${fullName(sub.member)}`
                      : 'Household-level membership'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Started: {new Date(sub.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-centre gap-2 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      sub.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : sub.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {sub.status === 'active'
                      ? 'Active'
                      : sub.status === 'pending'
                      ? 'Awaiting payment'
                      : sub.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            No memberships found yet for this household.
          </p>
        )}
      </section>
    </div>
  );
}
