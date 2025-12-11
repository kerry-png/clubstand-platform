//app/household/[household]/page.tsx
import { supabaseServerClient } from '@/lib/supabaseServer';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProceedToPaymentButton from './ProceedToPaymentButton';
import HouseholdPricingPreview from './HouseholdPricingPreview';
import RemoveMemberButton from './RemoveMemberButton';

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
    notFound();
  }

  // 2) Load members
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select(
      `
        id,
        club_id,
        household_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        member_type,
        created_at
      `,
    )
    .eq('household_id', householdId)
    .eq('club_id', household.club_id)
    .order('created_at', { ascending: true });

  if (membersError) {
    console.error('Members load error', membersError);
  }

  // 3) Load subscriptions for this household
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

  // Pricing breakdown (optional)
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

  const hasPendingSubs = pendingCount > 0;

  // 4) Load safeguarding
  const householdClubId = household.club_id;

  const { data: safeguardingQuestions } = await supabase
    .from('club_consent_questions')
    .select('*')
    .eq('club_id', householdClubId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const { data: safeguardingResponses } = await supabase
    .from('member_consent_responses')
    .select('*')
    .eq('household_id', householdId);

  const memberSubsMap = new Map<string, any[]>();
  (subscriptions ?? []).forEach((sub: any) => {
    const memId = sub.member?.id;
    if (!memId) return;
    const existing = memberSubsMap.get(memId) ?? [];
    existing.push(sub);
    memberSubsMap.set(memId, existing);
  });

  function safeguardingStatusForMember(memberId: string) {
    if (!safeguardingQuestions || safeguardingQuestions.length === 0) {
      return { complete: true, missing: [] as string[] };
    }

    const memberResponses =
      safeguardingResponses?.filter((r: any) => r.member_id === memberId) ??
      [];

    const missing: string[] = [];

    for (const q of safeguardingQuestions) {
      if (!q.required) continue;

      const hasAnswer = memberResponses.some(
        (r: any) => r.question_id === q.id && r.value !== null,
      );

      if (!hasAnswer) missing.push(q.label);
    }

    return {
      complete: missing.length === 0,
      missing,
    };
  }

  let householdSafeguardingComplete = true;
  (members ?? []).forEach((m: any) => {
    const status = safeguardingStatusForMember(m.id);
    if (!status.complete) householdSafeguardingComplete = false;
  });

  const formatMemberType = (member: any) => {
    switch (member.member_type) {
      case 'player':
        return 'Player';
      case 'supporter':
        return 'Social / Supporter';
      case 'coach':
        return 'Coach';
      case 'official':
        return 'Club official';
      default:
        return 'Member';
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
  const memberCount = members?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      {/* HEADER */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1
            className="text-2xl font-semibold text-slate-900"
            style={{ color: 'var(--brand-primary)' }}
          >
            {household.name || 'Your household'}
          </h1>
          <p className="text-sm text-slate-600">
            Step 1: add members. Step 2: complete consents.
            Step 3: review membership and pay securely online.
          </p>

          <div className="space-y-1 text-xs text-slate-600">
            <p>
              Main contact:{' '}
              <span className="font-medium">
                {household.primary_email || 'Not set'}
              </span>
              {household.phone && (
                <span className="ml-1">• {household.phone}</span>
              )}
            </p>
            <p>
              Address:{' '}
              {formatAddress() ? (
                <span>{formatAddress()}</span>
              ) : (
                <span className="italic text-slate-400">
                  No address on file
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-right text-xs text-slate-500">
          <p>
            Household ID:{' '}
            <span className="font-mono">{household.id}</span>
          </p>
          <p>
            Created:{' '}
            {household.created_at
              ? new Date(household.created_at).toLocaleString()
              : 'Unknown'}
          </p>
          {setupMode && (
            <p className="inline-block rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
              Setup mode – admin preview
            </p>
          )}
        </div>
      </section>

      {/* STEP 1 – MEMBERS */}
      <section className="space-y-3">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2
              className="text-lg font-semibold text-slate-900"
              style={{ color: 'var(--brand-primary)' }}
            >
              Step 1 – Household members
            </h2>
            <p className="text-sm text-slate-600">
              Add players, parents and other family members linked to this
              household.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {householdSafeguardingComplete ? (
              <Link
                href={`/household/${householdId}/add-member`}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Add member
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-400"
              >
                Add member (complete consents first)
              </button>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {memberCount === 0 ? (
            <p>
              No members yet. Use{' '}
              <span className="font-medium">Add member</span> to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {members?.map((m: any) => {
                const membership = membershipSummaryForMember(m.id);

                return (
                  <li
                    key={m.id}
                    className="flex flex-col gap-2 rounded-md bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {`${m.first_name ?? ''} ${
                          m.last_name ?? ''
                        }`.trim()}
                      </div>
                      <div className="text-xs text-slate-600">
                        {formatMemberType(m)}
                        {m.gender ? ` • ${m.gender}` : ''}
                        {m.date_of_birth
                          ? ` • DOB: ${m.date_of_birth}`
                          : ''}
                      </div>

                      {/* Pricing engine breakdown */}
                      {memberBreakdown
                        .filter((b) => b.memberId === m.id)
                        .map((b) => (
                          <div
                            key={b.memberId}
                            className="mt-1 space-x-1 text-xs"
                          >
                            {b.coveredByAdultBundle && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                                Covered by adult bundle
                              </span>
                            )}

                            {b.coveredByJuniorBundle && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800">
                                Covered by junior bundle
                              </span>
                            )}

                            {!b.coveredByAdultBundle &&
                              !b.coveredByJuniorBundle &&
                              b.pricePennies > 0 && (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-800">
                                  £{(b.pricePennies / 100).toFixed(0)}
                                </span>
                              )}
                          </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {membership.status === 'active' && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-800">
                          Active – {membership.planName ?? 'Membership'}
                        </span>
                      )}
                      {membership.status === 'pending' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Pending – {membership.planName ?? 'Membership'}
                        </span>
                      )}
                      {membership.status === 'none' && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          No membership
                        </span>
                      )}

                      <Link
                        href={`/household/${householdId}/members/${m.id}/edit`}
                        className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </Link>

                      <RemoveMemberButton
                        householdId={householdId}
                        memberId={m.id}
                        disabled={membership.status !== 'none'}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* STEP 2 – SAFEGUARDING */}
      <section className="space-y-3">
        <h2
          className="text-lg font-semibold text-slate-900"
          style={{ color: 'var(--brand-primary)' }}
        >
          Step 2 – Safeguarding & consents
        </h2>
        <p className="text-sm text-slate-600">
          Complete the club&apos;s safeguarding, photo and medical consents.
        </p>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {(members ?? []).map((m: any) => {
            const status = safeguardingStatusForMember(m.id);

            return (
              <div
                key={m.id}
                className="flex flex-col gap-2 rounded-md bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-medium">
                    {`${m.first_name ?? ''} ${
                      m.last_name ?? ''
                    }`.trim()}
                  </div>
                  {status.missing.length > 0 && (
                    <p className="mt-1 text-xs text-amber-800">
                      Missing:{' '}
                      <span className="font-medium">
                        {status.missing.join(', ')}
                      </span>
                    </p>
                  )}
                  {status.complete && (
                    <p className="mt-1 text-xs text-green-700">
                      All safeguarding questions completed.
                    </p>
                  )}
                </div>
                <Link
                  href={`/household/${householdId}/safeguarding?member=${m.id}`}
                  className="rounded-md px-2 py-1 text-xs text-white hover:opacity-90"
                  style={{ background: 'var(--brand-primary)' }}
                >
                  {status.complete ? 'View / update answers' : 'Complete now'}
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
      </section>

      {/* STEP 3 – MEMBERSHIPS & PAYMENTS */}
      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              className="text-lg font-semibold text-slate-900"
              style={{ color: 'var(--brand-primary)' }}
            >
              Step 3 – Membership & payments
            </h2>
            <p className="text-sm text-slate-600">
              Once consents are complete, review the membership summary below
              and proceed to secure payment online.
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p>
              Active memberships:{' '}
              <span className="font-semibold">{activeCount}</span>
            </p>
            <p>
              Pending memberships:{' '}
              <span className="font-semibold">{pendingCount}</span>
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {householdHasAnySubs ? (
            <ul className="space-y-2">
              {(subscriptions ?? []).map((sub: any) => (
                <li
                  key={sub.id}
                  className="flex flex-col gap-1 rounded-md bg-white px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {sub.plan?.name ?? 'Membership'}
                    </div>
                    <div className="text-slate-600">
                      {sub.member
                        ? `For ${sub.member.first_name} ${sub.member.last_name}`
                        : 'Household membership'}
                    </div>
                    <div className="text-slate-500">
                      Year {sub.membership_year} • Created{' '}
                      {new Date(sub.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">
                      £{(sub.amount_pennies / 100).toFixed(2)}
                    </div>
                    {sub.discount_pennies > 0 && (
                      <div className="text-[11px] text-green-700">
                        Includes discount £
                        {(sub.discount_pennies / 100).toFixed(2)}
                      </div>
                    )}
                    <div className="mt-1 text-[11px] uppercase tracking-wide">
                      {sub.status === 'active' && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">
                          ACTIVE
                        </span>
                      )}
                      {sub.status === 'pending' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                          PENDING
                        </span>
                      )}
                      {sub.status === 'cancelled' && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                          CANCELLED
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-700">
              No memberships started yet. Once you’ve completed consents, you’ll
              be able to review the total and pay online.
            </p>
          )}

          <HouseholdPricingPreview householdId={householdId} />

          {!householdSafeguardingComplete && (
            <p className="text-xs text-amber-700">
              Complete safeguarding and consent for all members before paying
              online.
            </p>
          )}

          <div className="pt-2">
            <ProceedToPaymentButton
              householdId={householdId}
              disabled={!householdSafeguardingComplete || !hasPendingSubs}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
