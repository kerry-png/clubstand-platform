// app/household/[householdId]/members/[memberId]/add-membership/page.tsx

import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { supabaseServerClient } from '@/lib/supabaseServer';

type PageProps = {
  params: Promise<{ householdId: string; memberId: string }>;
};

function getAgeOnDate(dobIso: string, onDate: Date) {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;

  let age = onDate.getFullYear() - dob.getFullYear();
  const m = onDate.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && onDate.getDate() < dob.getDate())) age--;
  return age;
}

function isJuniorForSeason(dobIso: string, membershipYear: number) {
  const sept1 = new Date(Date.UTC(membershipYear, 8, 1));
  const age = getAgeOnDate(dobIso, sept1);
  if (age === null) return null;
  return age < 18;
}

export default async function AddMembershipPage(props: PageProps) {
  const supabase = supabaseServerClient;
  const { householdId, memberId } = await props.params;

  // Default to next season
  const now = new Date();
  const membershipYear = now.getFullYear() + 1;

  const { data: household } = await supabase
    .from('households')
    .select('id, club_id, name')
    .eq('id', householdId)
    .maybeSingle();

  if (!household) notFound();

  const { data: member } = await supabase
    .from('members')
    .select('id, first_name, last_name, date_of_birth, club_id, household_id')
    .eq('id', memberId)
    .eq('household_id', householdId)
    .maybeSingle();

  if (!member) notFound();

  const juniorForSeason =
    member.date_of_birth ? isJuniorForSeason(member.date_of_birth, membershipYear) : null;

  // Load plans for this club
  const { data: plans } = await supabase
    .from('membership_plans')
    .select(
      `
      id,
      name,
      description,
      is_player_plan,
      is_junior_only,
      allow_annual,
      allow_monthly,
      annual_price_pennies,
      monthly_price_pennies,
      price_pennies,
      is_visible_online,
      is_archived
    `,
    )
    .eq('club_id', household.club_id)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true });

  const filteredPlans =
    (plans ?? []).filter((p: any) => {
      if (p.is_visible_online === false) return false;
      // We only allow player plans here for now (safe + simple)
      if (!p.is_player_plan) return false;

      // If DOB suggests junior/adult, restrict plans to match
      if (juniorForSeason === true) return p.is_junior_only === true;
      if (juniorForSeason === false) return p.is_junior_only === false;

      // If no DOB, allow any player plan
      return true;
    }) ?? [];

  const formatPrice = (p: number | null) => {
    if (p == null) return null;
    const pounds = (p / 100).toFixed(2);
    return pounds.endsWith('.00') ? `£${pounds.slice(0, -3)}` : `£${pounds}`;
  };

  async function create(formData: FormData) {
    'use server';

    const planId = String(formData.get('planId') || '');
    const billingPeriod = String(formData.get('billingPeriod') || '');

    if (!planId || (billingPeriod !== 'annual' && billingPeriod !== 'monthly')) {
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/memberships/add-subscription`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          householdId,
          memberId,
          planId,
          billingPeriod,
          membershipYear,
        }),
      },
    );

    if (!res.ok) {
      // simple fallback: go back with error flag (we can improve later)
      redirect(`/household/${householdId}?addMembership=failed`);
    }

    redirect(`/household/${householdId}?addMembership=success`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Add membership</h1>
        <p className="text-sm text-slate-600">
          Choose a membership for{' '}
          <span className="font-medium">
            {member.first_name} {member.last_name}
          </span>
          .
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="text-xs text-slate-600">
          Membership year: <span className="font-medium">{membershipYear}</span>
        </p>
        {member.date_of_birth && (
          <p className="text-xs text-slate-600">
            DOB: <span className="font-medium">{member.date_of_birth}</span>
            <span className="ml-2 italic text-slate-500">
              (junior status based on age on 1st September)
            </span>
          </p>
        )}
      </div>

      {filteredPlans.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No suitable membership plans found for this member.
        </div>
      ) : (
        <form action={create} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Membership plan</label>
            <select
              name="planId"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              required
            >
              {filteredPlans.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Billing period</label>
            <select
              name="billingPeriod"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              required
              defaultValue="annual"
            >
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
            </select>
            <p className="text-xs text-slate-500">
              This will only work if the plan is configured to allow that billing option.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Add membership
            </button>

            <Link
              href={`/household/${householdId}`}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>

          <div className="text-xs text-slate-500">
            Prices are calculated from the plan configuration (annual/monthly price).
          </div>
        </form>
      )}
    </div>
  );
}
