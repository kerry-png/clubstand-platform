// app/admin/clubs/[clubId]/pricing-config/PricingConfigForm.tsx

'use client';

import { useState } from 'react';
import type { ClubPricingConfig } from '@/lib/pricing/rainhill2026';

type Props = {
  clubId: string;
  membershipYear: number;
  initialConfig: ClubPricingConfig;
  hasExistingRow: boolean;
};

type FormState = ClubPricingConfig;

function formatMoneyPounds(pennies: number): number {
  return (pennies ?? 0) / 100;
}

function parseMoneyToPennies(raw: string): number {
  if (!raw) return 0;
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export default function PricingConfigForm({
  clubId,
  membershipYear,
  initialConfig,
  hasExistingRow,
}: Props) {
  const [form, setForm] = useState<FormState>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaveSuccess(false);
    setSaveError(null);
  };


  const handleNumberChange =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const num = raw === '' ? 0 : Number(raw);
      updateField(key, num as any);
    };

  const handleBooleanChange =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateField(key, e.target.checked as any);
    };

  const handleMoneyChange =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pennies = parseMoneyToPennies(e.target.value);
      updateField(key, pennies as any);
    };

  const handleStringChange =
    (key: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement
      >,
    ) => {
      updateField(key, e.target.value as any);
    };


  const previousYear = membershipYear - 1;
  const cutoffDateIso = (() => {
    try {
      const d = new Date(
        `${previousYear}-${String(form.cutoff_month).padStart(
          2,
          '0',
        )}-${String(form.cutoff_day).padStart(2, '0')}T00:00:00`,
      );
      if (Number.isNaN(d.getTime())) {
        return `${previousYear}-09-01`;
      }
      return d.toISOString().slice(0, 10);
    } catch {
      return `${previousYear}-09-01`;
    }
  })();

  const handleCutoffDateChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value; // yyyy-mm-dd
    if (!value) return;
    const [yearStr, monthStr, dayStr] = value.split('-');
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isFinite(month) || !Number.isFinite(day)) return;
    updateField('cutoff_month', month as any);
    updateField('cutoff_day', day as any);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(
        `/api/admin/clubs/${clubId}/pricing-config?year=${membershipYear}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg =
          json?.error ||
          json?.details ||
          `Save failed with status ${res.status}`;
        throw new Error(msg);
      }

      setSaveSuccess(true);
    } catch (err: any) {
      console.error('Saving pricing config failed', err);
      setSaveError(err?.message ?? 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  }

  const isBundledModel = form.pricing_model === 'bundled';

  return (
  <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-slate-700">
        <p className="font-semibold text-sky-900">
          Advanced pricing setup
        </p>
        <p className="mt-1">
          These settings control how this club&apos;s membership pricing
          engine behaves. During onboarding, ClubStand will usually set
          this up for each club. Once configured, most clubs won&apos;t
          need to change it until the following season.
        </p>
      </div>

      {/* Age boundaries */}
      <section className="border border-slate-200 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-medium">Age rules</h2>
        <p className="text-xs text-slate-600">
          Age is calculated on the cut-off date in the{' '}
          <span className="font-semibold">previous</span> year. Juniors
          are players with age ≤{' '}
          <code>junior_max_age</code>. Adults are players with age ≥{' '}
          <code>adult_min_age</code>.
        </p>

        <div className="max-w-xs space-y-1">
          <label className="flex flex-col text-sm gap-1">
            Junior age cut-off date (previous year)
            <input
              type="date"
              className="border rounded px-2 py-1 text-sm"
              value={cutoffDateIso}
              onChange={handleCutoffDateChange}
            />
          </label>
          <p className="text-xs text-slate-500">
            For example, for a cricket season in {membershipYear}, choose
            <span className="font-mono"> {previousYear}-09-01</span> for
            a 1 September cut-off.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md">
          <label className="flex flex-col text-sm gap-1">
            Junior max age (≤)
            <input
              type="number"
              min={0}
              className="border rounded px-2 py-1 text-sm"
              value={form.junior_max_age}
              onChange={handleNumberChange('junior_max_age')}
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            Adult min age (≥)
            <input
              type="number"
              min={0}
              className="border rounded px-2 py-1 text-sm"
              value={form.adult_min_age}
              onChange={handleNumberChange('adult_min_age')}
            />
          </label>
        </div>
      </section>

      {/* Adult bundle rules */}
      {/* Pricing model & adult bundle rules */}
      {/* Pricing model & adult bundle rules */}
      <section className="border border-slate-200 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-medium">Pricing model</h2>
        <p className="text-xs text-slate-600">
          Choose how membership pricing should work for this club. The options
          below control how adult, junior and social memberships are combined.
        </p>

        {/* Pricing model selector */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">
            Pricing model
          </label>
          <select
            className="mt-1 block w-full rounded border px-2 py-1 text-sm"
            value={form.pricing_model}
            onChange={handleStringChange('pricing_model')}
          >
          <option value="bundled">
              Family Bundles &amp; Multi-Member Discounts
            </option>
            <option value="flat">
              Flat Pricing
            </option>
            {/* Family cap engine coming later – keep in enum, hide in UI for now */}
          </select>

          {/* Dynamic explanation based on selection */}
          <div className="mt-1 text-xs text-slate-600 space-y-1">
            {form.pricing_model === 'bundled' && (
              <p>
                <span className="font-semibold">Bundles:</span> Use this when
                you offer adult bundles and junior caps (for example, two adults
                plus juniors for a fixed price).
              </p>
            )}

            {form.pricing_model === 'flat' && (
              <p>
                <span className="font-semibold">Flat pricing:</span> Every
                member just pays a straight membership price with no bundles or
                caps. Simpler for smaller clubs.
              </p>
            )}

            {form.pricing_model === 'family_cap' && (
              <p>
                <span className="font-semibold">Family cap:</span> Use this when
                you want to cap the total for a household (for example, juniors
                capped at a maximum amount per year).
              </p>
            )}
          </div>
        </div>

        {/* When bundled: show bundle rules. Otherwise: simple note. */}
        {isBundledModel ? (
          <div className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="text-sm font-semibold">
              Adult bundle rules (bundles model only)
            </h3>
            <p className="text-xs text-slate-600">
              These settings control when the adult bundle price applies (for
              example, two adults over a certain age with one or more juniors).
            </p>

            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.enable_adult_bundle}
                  onChange={handleBooleanChange('enable_adult_bundle')}
                />
                Enable adult bundle
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.require_junior_for_adult_bundle}
                  onChange={handleBooleanChange(
                    'require_junior_for_adult_bundle',
                  )}
                />
                Require junior membership for adult bundle
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md">
              <label className="flex flex-col text-sm gap-1">
                Adult bundle minimum age (e.g. 22)
                <input
                  type="number"
                  min={0}
                  className="border rounded px-2 py-1 text-sm"
                  value={form.adult_bundle_min_age}
                  onChange={handleNumberChange('adult_bundle_min_age')}
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Minimum adults required for bundle
                <input
                  type="number"
                  min={1}
                  className="border rounded px-2 py-1 text-sm"
                  value={form.min_adults_for_bundle}
                  onChange={handleNumberChange('min_adults_for_bundle')}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-slate-600">
              Adult bundle settings don&apos;t apply to this pricing model.
              For flat or family-cap models, pricing is controlled by the
              membership plans and caps rather than bundle rules.
            </p>
          </div>
        )}
      </section>

      {/* Price bands (in pounds) */}
      <section className="border border-slate-200 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-medium">Price bands (£ per year)</h2>
        <p className="text-xs text-slate-600">
          Enter prices in pounds. For example, type{' '}
          <code>115</code> for £115.00. Values are stored internally in
          pennies.
        </p>

        <div className="grid grid-cols-2 gap-4 max-w-xl">
          <label className="flex flex-col text-sm gap-1">
            Male full price (£)
            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1 text-sm"
              value={formatMoneyPounds(
                form.male_full_price_pennies,
              )}
              onChange={handleMoneyChange(
                'male_full_price_pennies',
              )}
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            Male intermediate price (£)
            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1 text-sm"
              value={formatMoneyPounds(
                form.male_intermediate_price_pennies,
              )}
              onChange={handleMoneyChange(
                'male_intermediate_price_pennies',
              )}
            />
          </label>

          <label className="flex flex-col text-sm gap-1">
            Female full price (£)
            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1 text-sm"
              value={formatMoneyPounds(
                form.female_full_price_pennies,
              )}
              onChange={handleMoneyChange(
                'female_full_price_pennies',
              )}
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            Female intermediate price (£)
            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1 text-sm"
              value={formatMoneyPounds(
                form.female_intermediate_price_pennies,
              )}
              onChange={handleMoneyChange(
                'female_intermediate_price_pennies',
              )}
            />
          </label>

          <label className="flex flex-col text-sm gap-1">
            Junior single price (£)
            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1 text-sm"
              value={formatMoneyPounds(
                form.junior_single_price_pennies,
              )}
              onChange={handleMoneyChange(
                'junior_single_price_pennies',
              )}
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            Junior multi price (£)
            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1 text-sm"
              value={formatMoneyPounds(
                form.junior_multi_price_pennies,
              )}
              onChange={handleMoneyChange(
                'junior_multi_price_pennies',
              )}
            />
          </label>

          <label className="flex flex-col text-sm gap-1">
            Social adult price (£)
            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1 text-sm"
              value={formatMoneyPounds(
                form.social_adult_price_pennies,
              )}
              onChange={handleMoneyChange(
                'social_adult_price_pennies',
              )}
            />
          </label>
          <label className="flex flex-col text-sm gap-1">
            Adult bundle price (£)
            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1 text-sm"
              value={formatMoneyPounds(
                form.adult_bundle_price_pennies,
              )}
              onChange={handleMoneyChange(
                'adult_bundle_price_pennies',
              )}
            />
          </label>
        </div>
      </section>

      {/* Save bar */}
      <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
        <div className="flex flex-col gap-1 text-xs">
          {saveError && (
            <span className="text-red-600">
              Error saving: {saveError}
            </span>
          )}
          {saveSuccess && !saveError && (
            <span className="text-emerald-700">
              Saved pricing config for {membershipYear}.
            </span>
          )}
          {!saveSuccess && !saveError && (
            <span className="text-slate-500">
              {hasExistingRow
                ? 'Updating existing configuration.'
                : 'Saving will create a configuration row for this club and year.'}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded bg-slate-900 text-white disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save configuration'}
        </button>
      </div>
    </form>
  );
}
