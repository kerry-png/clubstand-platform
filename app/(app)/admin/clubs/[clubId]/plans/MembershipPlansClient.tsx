// app/admin/clubs/[clubId]/plans/MembershipPlansClient.tsx

'use client';

import { useEffect, useState } from 'react';

type MembershipPlan = {
  id: string;
  club_id: string;
  name: string;
  slug: string;
  description: string | null;
  allow_annual: boolean;
  allow_monthly: boolean;
  annual_price_pennies: number | null;
  monthly_price_pennies: number | null;

  // ✅ Connect (club-owned Stripe) price IDs – read-only for admins
  stripe_price_id_annual_connected: string | null;
  stripe_price_id_monthly_connected: string | null;

  // Legacy fields may still exist in API responses; we keep them optional
  // so nothing breaks if returned, but we do NOT expose them for editing.
  stripe_price_id_annual?: string | null;
  stripe_price_id_monthly?: string | null;

  is_visible_online?: boolean;
  is_player_plan?: boolean;
  is_household_plan?: boolean;
  is_junior_only?: boolean;
  minimum_age?: number | null;
  maximum_age?: number | null;
  requires_approval?: boolean;
  mid_season_treatment?: 'inherit' | 'full' | 'prorata' | 'trial' | 'manual';
  trial_days?: number | null;
  signing_fee_pennies?: number;
  allow_discount_codes?: boolean;
  sort_order?: number | null;
  is_active?: boolean;
  is_archived?: boolean;
};

type Props = {
  clubId: string;
};

function formatPenniesToPounds(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return (value / 100).toFixed(2).replace(/\.00$/, '');
}

function parsePoundsToPennies(raw: string): number | null {
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

export default function MembershipPlansClient({ clubId }: Props) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [allCount, setAllCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] =
    useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Load plans
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/clubs/${clubId}/membership-plans`);

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const msg =
            json?.error || `Failed to load plans (status ${res.status})`;
          throw new Error(msg);
        }

        const data = (await res.json()) as { plans: MembershipPlan[] };
        const allPlans = data.plans || [];

        const normalisedClubId = (clubId ?? '').trim().toLowerCase();
        const clubPlans = allPlans.filter((p) => {
          const pid = (p.club_id ?? '').trim().toLowerCase();
          return pid === normalisedClubId;
        });

        if (!cancelled) {
          setAllCount(allPlans.length);
          setPlans(clubPlans);

          // Default to first plan expanded
          if (clubPlans.length && !expandedPlanId) {
            setExpandedPlanId(clubPlans[0].id);
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load membership plans', err);
          setError(err?.message ?? 'Failed to load membership plans');
          setPlans([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Warn if navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = '';
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const planNeedsStripeSync = (plan: MembershipPlan): boolean => {
    // If billing is enabled, we require a connected Stripe price ID
    if (plan.allow_annual && !plan.stripe_price_id_annual_connected) return true;
    if (plan.allow_monthly && !plan.stripe_price_id_monthly_connected) return true;
    return false;
  };

  const updatePlan = <K extends keyof MembershipPlan>(
    id: string,
    key: K,
    value: MembershipPlan[K],
  ) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)),
    );
    setSaveStatus('idle');
    setHasUnsavedChanges(true);
    setError(null);
  };

  const handleSavePlan = async (plan: MembershipPlan) => {
    setSaveStatus('saving');
    setError(null);

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/membership-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          description: plan.description,

          allow_annual: plan.allow_annual,
          allow_monthly: plan.allow_monthly,
          annual_price_pennies: plan.annual_price_pennies,
          monthly_price_pennies: plan.monthly_price_pennies,

          // IMPORTANT: Stripe price IDs are generated by the Stripe sync step,
          // not typed in by club admins, so we do NOT send them here.

          is_visible_online: plan.is_visible_online ?? true,
          is_player_plan: plan.is_player_plan ?? true,
          is_junior_only: plan.is_junior_only ?? false,
          minimum_age: plan.minimum_age ?? null,
          maximum_age: plan.maximum_age ?? null,
          requires_approval: plan.requires_approval ?? false,
          mid_season_treatment: plan.mid_season_treatment ?? 'inherit',
          trial_days: plan.trial_days ?? null,
          is_household_plan: plan.is_household_plan ?? false,
          signing_fee_pennies: plan.signing_fee_pennies ?? 0,
          allow_discount_codes: plan.allow_discount_codes ?? true,
          is_archived: plan.is_archived ?? false,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg = json?.error || `Failed to save plan (status ${res.status})`;
        throw new Error(msg);
      }

      const data = (await res.json()) as { plan: MembershipPlan };
      setPlans((prev) => prev.map((p) => (p.id === data.plan.id ? data.plan : p)));
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
    } catch (err: any) {
      console.error('Failed to save membership plan', err);
      setError(err?.message ?? 'Failed to save membership plan');
      setSaveStatus('error');
    }
  };

  const handleCreatePlan = async () => {
    setSaveStatus('saving');
    setError(null);

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/membership-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_id: clubId,
          name: 'New Membership Plan',
          slug: `plan-${Date.now()}`,
          description: '',
          is_player_plan: true,
          is_junior_only: false,
          minimum_age: null,
          maximum_age: null,
          requires_approval: false,
          mid_season_treatment: 'inherit',
          trial_days: null,
          is_household_plan: false,
          is_visible_online: false,

          allow_annual: true,
          allow_monthly: false,
          annual_price_pennies: 0,
          monthly_price_pennies: null,

          is_archived: false,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.error || `Failed to create plan (status ${res.status})`;
        throw new Error(msg);
      }

      const data = json as { plan: MembershipPlan };

      setPlans((prev) => [...prev, data.plan]);
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      setExpandedPlanId(data.plan.id);

      setTimeout(() => {
        const el = document.getElementById(`plan-${data.plan.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    } catch (err: any) {
      console.error('Failed to create membership plan', err);
      setError(err?.message ?? 'Failed to create membership plan');
      setSaveStatus('error');
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading membership plans…</p>;
  }

  const activePlans = plans.filter((p) => !p.is_archived);
  const archivedPlans = plans.filter((p) => p.is_archived);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className="text-xs text-slate-600 underline"
        >
          {showArchived ? 'Hide Archived Plans' : 'Show Archived Plans'}
        </button>

        <button
          type="button"
          onClick={handleCreatePlan}
          className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-950"
        >
          + Add New Plan
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <p className="text-xs text-slate-500">
        {plans.length} membership plans for this club (out of {allCount} total in the system).
        Plans highlighted in green are visible on the public join page.
      </p>

      {activePlans.length === 0 && !error && (
        <p className="text-sm text-slate-600">
          No membership plans found for this club yet. You can seed them in the database or add new
          ones with “Add New Plan”.
        </p>
      )}

      {/* ACTIVE PLANS (accordion style) */}
      {activePlans.length > 0 && (
        <div className="space-y-4">
          {activePlans.map((plan) => {
            const annualNeedsSync =
              plan.allow_annual && !plan.stripe_price_id_annual_connected;
            const monthlyNeedsSync =
              plan.allow_monthly && !plan.stripe_price_id_monthly_connected;

            const needsStripeSync = annualNeedsSync || monthlyNeedsSync;

            const isVisible = plan.is_visible_online ?? true;
            const isExpanded = expandedPlanId === plan.id;

            const annualSummary =
              plan.allow_annual && plan.annual_price_pennies
                ? `Annual £${formatPenniesToPounds(plan.annual_price_pennies)}`
                : 'Annual off';

            const monthlySummary =
              plan.allow_monthly && plan.monthly_price_pennies
                ? `Monthly £${formatPenniesToPounds(plan.monthly_price_pennies)}`
                : 'Monthly off';

            return (
              <div
                key={plan.id}
                id={`plan-${plan.id}`}
                className={`rounded-xl border bg-white shadow-sm transition ${
                  isVisible ? 'border-emerald-500/80' : 'border-slate-200'
                }`}
              >
                {/* Compact header row */}
                <div
                  onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                  className="flex w-full items-center justify-between gap-4 rounded-t-xl border-b border-slate-200 bg-slate-50 px-4 py-3 text-left"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={plan.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const newName = e.target.value;
                          updatePlan(plan.id, 'name', newName);

                          const newSlug = newName
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/(^-|-$)/g, '');

                          updatePlan(plan.id, 'slug', newSlug);
                        }}
                        className="w-full max-w-xs rounded border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900"
                        placeholder="Plan name"
                      />

                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                        slug: {plan.slug}
                      </span>

                      {plan.is_player_plan && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
                          Player
                        </span>
                      )}
                      {plan.is_household_plan && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
                          Household
                        </span>
                      )}
                      {plan.is_junior_only && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-700">
                          Junior Only
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600">
                      {annualSummary} · {monthlySummary}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 text-xs text-slate-700">
                    <label
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={plan.is_visible_online ?? true}
                        onChange={(e) => {
                          const next = e.target.checked;

                          if (next && planNeedsStripeSync(plan)) {
                            alert(
                              'This plan needs Stripe prices syncing for at least one enabled billing period. Go to Admin → Payments → Stripe and click “Sync membership prices”.',
                            );
                            return;
                          }

                          updatePlan(plan.id, 'is_visible_online', next);
                        }}
                      />

                      {isVisible ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          Visible online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          Hidden from join page
                        </span>
                      )}
                    </label>

                    {needsStripeSync && (
                      <span className="rounded bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">
                        Not Stripe-ready – sync prices in Payments → Stripe.
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="space-y-5 px-4 py-4">
                    <label className="flex flex-col gap-1 text-sm">
                      Description (optional)
                      <textarea
                        className="min-h-[64px] rounded border px-2 py-1 text-sm"
                        value={plan.description ?? ''}
                        onChange={(e) =>
                          updatePlan(plan.id, 'description', e.target.value)
                        }
                        placeholder="Short description shown to members"
                      />
                    </label>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Who is this membership for?
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        These settings drive which memberships ClubStand offers during household registration.
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                          <input
                            type="checkbox"
                            checked={plan.is_player_plan ?? true}
                            onChange={(e) => updatePlan(plan.id, 'is_player_plan', e.target.checked)}
                          />
                          <span><b className="block text-xs">Playing membership</b><span className="text-[11px] text-slate-500">Off means social / non-playing.</span></span>
                        </label>
                        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                          <input
                            type="checkbox"
                            checked={plan.is_junior_only ?? false}
                            onChange={(e) => updatePlan(plan.id, 'is_junior_only', e.target.checked)}
                          />
                          <span><b className="block text-xs">Junior only</b><span className="text-[11px] text-slate-500">Uses the club's junior age rule.</span></span>
                        </label>
                        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                          <input
                            type="checkbox"
                            checked={plan.is_household_plan ?? false}
                            onChange={(e) => updatePlan(plan.id, 'is_household_plan', e.target.checked)}
                          />
                          <span><b className="block text-xs">Household plan</b><span className="text-[11px] text-slate-500">One plan can cover several people.</span></span>
                        </label>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Eligibility & joining rules</h3>
                      <p className="mt-1 text-xs text-slate-500">Leave ages blank to use the club's normal junior/adult rule. Use an age range for plans such as U13, student or veteran memberships.</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-semibold">Minimum age<input type="number" min={0} max={99} className="field mt-1" value={plan.minimum_age ?? ''} onChange={e=>updatePlan(plan.id,'minimum_age',e.target.value===''?null:Number(e.target.value))}/></label>
                        <label className="text-xs font-semibold">Maximum age<input type="number" min={0} max={99} className="field mt-1" value={plan.maximum_age ?? ''} onChange={e=>updatePlan(plan.id,'maximum_age',e.target.value===''?null:Number(e.target.value))}/></label>
                        <label className="text-xs font-semibold">Mid-season joining<select className="field mt-1" value={plan.mid_season_treatment ?? 'inherit'} onChange={e=>updatePlan(plan.id,'mid_season_treatment',e.target.value as MembershipPlan['mid_season_treatment'])}><option value="inherit">Use club default</option><option value="full">Full price</option><option value="prorata">Pro-rata annual price</option><option value="trial">Trial first</option><option value="manual">Club decides manually</option></select></label>
                        <label className="text-xs font-semibold">Trial days<input type="number" min={0} max={365} className="field mt-1" disabled={(plan.mid_season_treatment ?? 'inherit')!=='trial'} value={plan.trial_days ?? ''} onChange={e=>updatePlan(plan.id,'trial_days',e.target.value===''?null:Number(e.target.value))}/></label>
                      </div>
                      <label className="mt-3 flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={plan.requires_approval ?? false} onChange={e=>updatePlan(plan.id,'requires_approval',e.target.checked)}/> Club approval required before this membership is activated</label>
                      <p className="mt-3 text-[11px] text-slate-500">Administrators will also be able to authorise a recorded exception for an individual member without changing these rules for everyone else.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Annual */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase text-slate-500">
                            Annual billing
                          </h3>

                          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={plan.allow_annual}
                              onChange={(e) =>
                                updatePlan(plan.id, 'allow_annual', e.target.checked)
                              }
                            />
                            Allow annual
                          </label>
                        </div>

                        <label className="flex flex-col gap-1 text-sm">
                          Annual price (£)
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="rounded border px-2 py-1 text-sm"
                            value={formatPenniesToPounds(plan.annual_price_pennies)}
                            onChange={(e) =>
                              updatePlan(
                                plan.id,
                                'annual_price_pennies',
                                parsePoundsToPennies(e.target.value),
                              )
                            }
                            disabled={!plan.allow_annual}
                          />
                          <span className="text-xs text-slate-500">
                            Full annual amount, e.g. £80 for the year.
                          </span>
                        </label>

                        {plan.allow_annual && (
                          <p className="text-[11px] text-slate-500">
                            Stripe annual price:{' '}
                            {plan.stripe_price_id_annual_connected ? 'Synced' : 'Not yet synced'}
                          </p>
                        )}
                      </div>

                      {/* Monthly */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase text-slate-500">
                            Monthly billing
                          </h3>

                          <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={plan.allow_monthly}
                              onChange={(e) =>
                                updatePlan(plan.id, 'allow_monthly', e.target.checked)
                              }
                            />
                            Allow monthly
                          </label>
                        </div>

                        <label className="flex flex-col gap-1 text-sm">
                          Monthly price (£)
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="rounded border px-2 py-1 text-sm"
                            value={formatPenniesToPounds(plan.monthly_price_pennies)}
                            onChange={(e) =>
                              updatePlan(
                                plan.id,
                                'monthly_price_pennies',
                                parsePoundsToPennies(e.target.value),
                              )
                            }
                            disabled={!plan.allow_monthly}
                          />
                          <span className="text-xs text-slate-500">
                            For example, juniors at £13 per month.
                          </span>
                        </label>

                        {plan.allow_monthly && (
                          <p className="text-[11px] text-slate-500">
                            Stripe monthly price:{' '}
                            {plan.stripe_price_id_monthly_connected ? 'Synced' : 'Not yet synced'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        Save each plan after making changes. Only plans that are visible online and
                        have been synced to Stripe will appear in the public join flow.
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSavePlan(plan)}
                          disabled={saveStatus === 'saving'}
                          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-950 disabled:opacity-60"
                        >
                          {saveStatus === 'saving' ? 'Saving…' : 'Save Plan'}
                        </button>

                        {!plan.is_archived && (
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  'Archive this plan? It will be hidden from members but kept for records.',
                                )
                              ) {
                                updatePlan(plan.id, 'is_archived', true);
                              }
                            }}
                            className="text-[11px] text-red-600 hover:underline"
                          >
                            Archive Plan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ARCHIVED PLANS */}
      {showArchived && archivedPlans.length > 0 && (
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Archived plans</h3>

          {archivedPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
            >
              <span>{plan.name}</span>
              <button
                type="button"
                onClick={() => updatePlan(plan.id, 'is_archived', false)}
                className="text-[11px] text-emerald-700 hover:underline"
              >
                Unarchive
              </button>
            </div>
          ))}
        </div>
      )}

      {saveStatus === 'saved' && !error && (
        <p className="text-xs text-emerald-700">Plan saved successfully.</p>
      )}
    </div>
  );
}
