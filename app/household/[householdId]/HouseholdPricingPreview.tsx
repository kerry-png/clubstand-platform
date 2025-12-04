//app/household/[householdId]/HouseholdPricingPreview.tsx

'use client';

import { useEffect, useState } from 'react';

type Props = {
  householdId: string;
};

type PricingDebug = {
  adultSumPennies: number;
  juniorSumPennies: number;
  socialSumPennies: number;
  adultCount: number;
  adult22PlusCount: number;
  juniorCount: number;
  socialCount: number;
};

type JuniorsBundle = {
  type: 'none' | 'single' | 'multi';
  annualPennies: number;
  coveredJuniorIds: string[];
};

type RainhillPricingResult = {
  seasonYear: number;
  cutoffDate: string;
  totalPennies: number;
  adultBundleApplied: boolean;
  adultBundleEligible: boolean;
  adultBundlePricePennies: number;
  juniorsBundle: JuniorsBundle;
  debug?: PricingDebug;
};

type PricingState = {
  engine: RainhillPricingResult;
  remainingPennies?: number;
  coveredPennies?: number; // active (paid)
  pendingPennies?: number; // pending (awaiting payment)
};

function formatPounds(pennies: number | undefined | null): string {
  if (pennies == null) return '£0';
  const value = pennies / 100;
  const formatted =
    Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return `£${formatted}`;
}

export default function HouseholdPricingPreview({ householdId }: Props) {
  const [pricing, setPricing] = useState<PricingState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPricing() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/households/${householdId}/pricing?refresh=${refreshKey}`,
          {
            method: 'GET',
            headers: { Accept: 'application/json' },
          },
        );

        if (!res.ok) {
          const text = await res.text();
          if (!cancelled) {
            setError(
              `Failed to load pricing (${res.status}). ${
                text || 'Please try again.'
              }`,
            );
          }
          return;
        }

        const json = await res.json();

        const engine: RainhillPricingResult | undefined =
          json?.enginePricing ?? json?.pricing?.engine;
        const totals = json?.pricing?.totals;

        if (!cancelled) {
          if (!engine) {
            setError('No pricing data returned for this household.');
            setPricing(null);
          } else {
            setPricing({
              engine,
              remainingPennies: totals?.remainingAnnualPennies,
              coveredPennies: totals?.alreadyCoveredAnnualPennies,
              pendingPennies: totals?.pendingAnnualPennies,
            });
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.message ||
              'Unexpected error while loading pricing data.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPricing();

    return () => {
      cancelled = true;
    };
  }, [householdId, refreshKey]);

  const handleRecalculate = () => {
    setRefreshKey((k) => k + 1);
  };

  if (loading && !pricing && !error) {
    return (
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        Calculating your 2026 membership based on everyone in this household…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-2">
        <div className="font-semibold">Membership pricing preview</div>
        <div>{error}</div>
        <button
          type="button"
          onClick={handleRecalculate}
          className="mt-1 inline-flex items-center rounded border border-red-300 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        No pricing could be calculated yet. Make sure everyone who needs a
        membership is added to this household.
      </div>
    );
  }

const {
  engine,
  remainingPennies,
  coveredPennies: rawCovered = 0,
  pendingPennies: rawPending = 0,
} = pricing;

const coveredPennies = rawCovered ?? 0;
const pendingPennies = rawPending ?? 0;

const debug = engine.debug;

  const seasonLabel =
    typeof engine.seasonYear === 'number' && engine.seasonYear > 0
      ? engine.seasonYear
      : '2026';

  return (
    <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">
          2026 membership preview (season {seasonLabel})
        </div>
        <button
          type="button"
          onClick={handleRecalculate}
          className="inline-flex items-center rounded border border-emerald-300 bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50"
        >
          Recalculate pricing
        </button>
      </div>

      <p>
        Based on everyone currently in this household, the total 2026
        membership cost is{' '}
        <span className="font-semibold">
          {formatPounds(engine.totalPennies)}
        </span>
        .
      </p>

      {typeof remainingPennies === 'number' && (
        <p>
          Remaining to pay for 2026:{' '}
          <span className="font-semibold">
            {formatPounds(remainingPennies)}
          </span>{' '}
          {remainingPennies === 0 && (
            <span className="text-emerald-900/80">
              (you don&apos;t need to pay anything else online for 2026)
            </span>
          )}
          {remainingPennies > 0 &&
            typeof coveredPennies === 'number' &&
            coveredPennies > 0 && (
              <span className="text-emerald-900/80">
                (already covered{' '}
                {formatPounds(coveredPennies)} in active/pending
                subscriptions)
              </span>
            )}
        </p>
      )}

      {debug && (
        <div className="grid gap-1 sm:grid-cols-2">
          <div>
            <div className="font-medium">Breakdown (before bundles)</div>
            <p>
              Adults:{' '}
              <span className="font-semibold">
                {formatPounds(debug.adultSumPennies)}
              </span>{' '}
              ({debug.adultCount} adult
              {debug.adultCount === 1 ? '' : 's'}, {debug.adult22PlusCount}{' '}
              aged 22+)
            </p>
            <p>
              Juniors:{' '}
              <span className="font-semibold">
                {formatPounds(debug.juniorSumPennies)}
              </span>{' '}
              ({debug.juniorCount} junior
              {debug.juniorCount === 1 ? '' : 's'})
              {debug.juniorCount > 0 && (
                <>
                  {' '}
                  <span className="text-emerald-900/80">
                    {/* Rainhill-specific wording: juniors pay monthly via DD */}
                    {debug.juniorCount === 1
                      ? ' — equivalent to £13/month direct debit'
                      : ' — equivalent to £20/month direct debit for the household'}
                  </span>
                </>
              )}
            </p>
            <p>
              Socials:{' '}
              <span className="font-semibold">
                {formatPounds(debug.socialSumPennies)}
              </span>{' '}
              ({debug.socialCount} social member
              {debug.socialCount === 1 ? '' : 's'})
            </p>
          </div>

          <div>
            <div className="font-medium">Bundles &amp; offers</div>
            <p>
              Adult bundle:{' '}
              {engine.adultBundleApplied ? (
                <>
                  <span className="font-semibold">applied</span> at{' '}
                  {formatPounds(engine.adultBundlePricePennies)}
                </>
              ) : engine.adultBundleEligible ? (
                <>
                  <span className="font-semibold">eligible</span> (will apply if
                  it makes the adults cheaper)
                </>
              ) : (
                'not applicable for this household'
              )}
            </p>
            <p>
              Junior bundle:{' '}
              {engine.juniorsBundle.type === 'none' && 'no juniors yet'}
              {engine.juniorsBundle.type === 'single' && (
                <>
                  single junior –{' '}
                  {formatPounds(engine.juniorsBundle.annualPennies)}
                </>
              )}
              {engine.juniorsBundle.type === 'multi' && (
                <>
                  multi-junior household –{' '}
                  {formatPounds(engine.juniorsBundle.annualPennies)} (covers{' '}
                  {engine.juniorsBundle.coveredJuniorIds.length} junior
                  {engine.juniorsBundle.coveredJuniorIds.length === 1
                    ? ''
                    : 's'}
                  )
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <p className="text-[11px] text-emerald-800/80">
        This is a preview only. Your actual membership subscriptions for 2026
        are created when you use the renew button below and complete payment.
      </p>
    </div>
  );
}
