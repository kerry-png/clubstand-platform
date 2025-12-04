// app/household/[householdId]/page.tsx

import { supabaseServerClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProceedToPaymentButton from './ProceedToPaymentButton';
import HouseholdPricingPreview from './HouseholdPricingPreview';
import { RenewButton } from './RenewButton';

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

  const setupRaw =
    typeof query?.setup === 'string'
      ? query.setup
      : Array.isArray(query?.setup)
      ? query?.setup[0]
      : undefined;

  const setupMode = setupRaw === '1';

// 1) Load household
const { data: household, error: householdError } = await supabase
  .from('households')
  .select(
    `
      id,
      club_id,
      name,
      primary_email,
      phone,
      address_line1,
      address_line2,
      town_city,
      postcode,
      created_at
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
        member_type,
        created_at
      `,
    )
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (membersError) {
    console.error('Members load error', membersError);
  }

  // 3) Load subscriptions for this household with plan + member
  const { data: subscriptions, error: subsError } = await supabase
    .from('membership_subscriptions')
    .select(
      `
        id,
        status,
        created_at,
        membership_year,
        amount_pennies,
        discount_pennies,
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

  // --- Load pricing breakdown (bundle coverage etc.) ---
  let memberBreakdown: any[] = [];

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

    const pricingRes = await fetch(
      `${baseUrl}/api/households/${householdId}/pricing`,
      { method: 'GET', cache: 'no-store' },
    );

    if (pricingRes.ok) {
      const pricingJson = await pricingRes.json();
      memberBreakdown = pricingJson?.pricing?.memberBreakdown ?? [];
    } else {
      console.error('Pricing fetch returned status', pricingRes.status);
    }
  } catch (err) {
    console.error('Failed to load pricing breakdown', err);
  }

  const pendingCount =
    subscriptions?.filter((s: any) => s.status === 'pending').length ?? 0;
  const activeCount =
    subscriptions?.filter((s: any) => s.status === 'active').length ?? 0;

  // 4) Load safeguarding questions + responses for this household
  const householdClubId = household.club_id;

  // Load questions for this club
  const { data: safeguardingQuestions } = await supabase
    .from('club_consent_questions')
    .select('*')
    .eq('club_id', householdClubId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // Load all responses for this household
  const { data: safeguardingResponses } = await supabase
    .from('member_consent_responses')
    .select('*')
    .eq('household_id', householdId);

  // Map memberId -> subscriptions for that member
  const memberSubsMap = new Map<string, any[]>();
  (subscriptions ?? []).forEach((sub: any) => {
    const memId = sub.member?.id;
    if (!memId) return;
    const existing = memberSubsMap.get(memId) ?? [];
    existing.push(sub);
    memberSubsMap.set(memId, existing);
  });

  // Safeguarding status helpers
  function safeguardingStatusForMember(memberId: string) {
    if (!safeguardingQuestions || safeguardingQuestions.length === 0) {
      // No questions configured = treat as complete
      return { complete: true, missing: [] as string[] };
    }

    const memberResponses =
      safeguardingResponses?.filter((r: any) => r.member_id === memberId) ?? [];

    const missing: string[] = [];

    for (const q of safeguardingQuestions) {
      // Only required questions count
      if (!q.required) continue;

      // (Optional: later we can add applies_to logic for juniors/adults/parents)
      const hasAnswer = memberResponses.some(
        (r: any) => r.question_id === q.id,
      );

      if (!hasAnswer) {
        missing.push(q.label);
      }
    }

    return {
      complete: missing.length === 0,
      missing,
    };
  }

  // Household-level flag: are ALL members complete?
  let householdSafeguardingComplete = true;
  (members ?? []).forEach((m: any) => {
    const status = safeguardingStatusForMember(m.id);
    if (!status.complete) {
      householdSafeguardingComplete = false;
    }
  });

  const formatMemberType = (member: any) => {
    switch (member.member_type) {
      case 'player':
        return 'Player';
      case 'supporter':
        return 'Social / Supporter';
      case 'coach':
        return 'Coach';
      default:
        return member.member_type ?? 'Member';
    }
  };


  const formatAddress = () => {
    const parts = [
      household.address_line1,
      household.address_line2,
      household.town_city,
      household.postcode,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const membershipSummaryForMember = (memberId: string) => {
    const subs = memberSubsMap.get(memberId) ?? [];
    if (!subs.length) {
      return {
        status: 'none',
        planName: null as string | null,
      };
    }

    const latest = subs[0] as any;
    const planName = latest.plan?.name ?? null;
    const status = latest.status ?? 'unknown';

    return {
      status,
      planName,
    };
  };

  const householdHasAnySubs = (subscriptions ?? []).length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {household.name || 'Household'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Household ID:{' '}
            <span className="font-mono">{household.id}</span>
          </p>
          <p className="text-sm text-slate-600">
            Address:{' '}
            {formatAddress() || (
              <span className="italic text-slate-400">
                No address on file
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Link
            href={`/household/${householdId}/add-member`}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Add member
          </Link>
          <RenewButton householdId={householdId} seasonYear={2026} />
          
          <ProceedToPaymentButton
            householdId={householdId}
            disabled={!householdSafeguardingComplete}
          />
        </div>
      </div>

      {/* HOUSEHOLD SUMMARY */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">
          Household summary
        </h2>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-700">
          <p>
            Household created:{' '}
            {household.created_at
              ? new Date(household.created_at).toLocaleString()
              : 'Unknown'}
          </p>
          {setupMode && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
              Setup mode: you’re viewing this household as an admin to
              complete initial configuration.
            </p>
          )}
        </div>
      </section>

      {/* SAFEGUARDING & CONSENTS */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Safeguarding & consents
        </h2>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm text-slate-700">
          {(members ?? []).map((m: any) => {
            const status = safeguardingStatusForMember(m.id);

            return (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-md bg-white px-3 py-2"
              >
                <div>
                  <div className="font-medium text-sm">
                    {`${m.first_name ?? ''} ${m.last_name ?? ''}`.trim()}
                  </div>
                  {!status.complete && (
                    <p className="text-xs text-red-700 mt-1">
                      Missing: {status.missing.join(', ')}
                    </p>
                  )}
                  {status.complete && (
                    <p className="text-xs text-green-700 mt-1">
                      All safeguarding questions completed
                    </p>
                  )}
                </div>
                <Link
                  href={`/household/${householdId}/safeguarding?member=${m.id}`}
                  className="px-2 py-1 rounded-md bg-slate-900 text-white text-xs hover:bg-slate-800"
                >
                  {status.complete
                    ? 'View / update answers'
                    : 'Complete now'}
                </Link>
              </div>
            );
          })}

          {(!members || members.length === 0) && (
            <p className="text-xs text-slate-600">
              Add members to this household to collect safeguarding and consent
              information.
            </p>
          )}
        </div>

        {!householdSafeguardingComplete && (
          <p className="text-xs text-red-700">
            All required safeguarding consents must be completed before you can
            proceed to payment.
          </p>
        )}
      </section>


      {/* MEMBERS SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Members in this household
          </h2>
          {setupMode && (
            <span className="text-xs rounded-full bg-amber-50 px-2 py-1 text-amber-700 border border-amber-200">
              Setup mode
            </span>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-sm text-slate-700">
            This household currently has{' '}
            <span className="font-semibold">{members?.length ?? 0}</span>{' '}
            member{(members?.length ?? 0) === 1 ? '' : 's'}.
          </p>

          {members && members.length > 0 ? (
            <ul className="space-y-2">
              {members.map((m) => {
                const membership = membershipSummaryForMember(m.id);

                return (
                  <li
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border rounded-md px-3 py-2 bg-white"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {`${m.first_name ?? ''} ${
                          m.last_name ?? ''
                        }`.trim()}
                      </div>
                      <div className="text-xs text-gray-600">
                        {formatMemberType(m)}
                        {m.gender ? ` • ${m.gender}` : ''}
                        {m.date_of_birth
                          ? ` • DOB: ${m.date_of_birth}`
                          : ''}

                        {/* Pricing engine breakdown (bundle coverage etc.) */}
                        {memberBreakdown
                          .filter((b) => b.memberId === m.id)
                          .map((b) => (
                            <div
                              key={b.memberId}
                              className="mt-1 text-xs space-x-1"
                            >
                              {b.coveredByAdultBundle && (
                                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                  Covered by adult bundle
                                </span>
                              )}

                              {b.coveredByJuniorBundle && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                  Covered by junior bundle
                                </span>
                              )}

                              {!b.coveredByAdultBundle &&
                                !b.coveredByJuniorBundle &&
                                b.pricePennies > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                                    £{(b.pricePennies / 100).toFixed(0)}
                                  </span>
                                )}

                              {b.type === 'none' &&
                                b.pricePennies === 0 &&
                                !b.coveredByAdultBundle &&
                                !b.coveredByJuniorBundle && (
                                  <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                                    No membership required
                                  </span>
                                )}
                            </div>
                          ))}
                      </div>

                      {membership.planName && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          Membership: {membership.planName}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs items-center">
                      {membership.status === 'active' && (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                          Active membership
                        </span>
                      )}
                      {membership.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Awaiting payment
                        </span>
                      )}
                      {membership.status === 'none' && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          No membership yet
                        </span>
                      )}

                      <Link
                        href={`/household/${householdId}/members/${m.id}/edit`}
                        className="px-2 py-0.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-700">
              There are no members yet in this household. Use the “Add
              member” button above to get started.
            </p>
          )}
        </div>
      </section>

      {/* MEMBERSHIPS & PAYMENTS SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Memberships & payments
          </h2>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-sm text-slate-700">
            You have{' '}
            <span className="font-semibold">{pendingCount}</span>{' '}
            membership{pendingCount === 1 ? '' : 's'} awaiting payment.
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-semibold">{activeCount}</span>{' '}
            membership{activeCount === 1 ? '' : 's'} are currently
            active for this household.
          </p>

          {!householdHasAnySubs && (
            <p className="text-xs text-slate-600">
              Once you start a membership for any member in this
              household, you’ll see the full history and payment status
              here.
            </p>
          )}

          <HouseholdPricingPreview householdId={householdId} />
        </div>
      </section>
    </div>
  );
}
