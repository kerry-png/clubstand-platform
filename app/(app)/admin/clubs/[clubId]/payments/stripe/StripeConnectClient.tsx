// app/admin/clubs/[clubId]/payments/stripe/StripeConnectClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type StripeStatus = {
  connected: boolean;
  status: 'not_connected' | 'pending' | 'connected' | 'restricted' | string;
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements?: any;
};

export default function StripeConnectClient({ clubId }: { clubId: string }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StripeStatus | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/stripe/status`, {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) throw new Error(json?.error || 'Failed to load Stripe status');

      // Normalise a little so the UI can rely on `status`
      const connected = !!json?.connected;
      const chargesEnabled = !!json?.charges_enabled;
      const payoutsEnabled = !!json?.payouts_enabled;
      const detailsSubmitted = !!json?.details_submitted;

      let computedStatus: StripeStatus['status'] = 'not_connected';
      if (!json?.stripe_account_id) computedStatus = 'not_connected';
      else if (chargesEnabled && payoutsEnabled && detailsSubmitted) computedStatus = 'connected';
      else if (json?.requirements?.currently_due?.length) computedStatus = 'restricted';
      else computedStatus = 'pending';

      setStatus({
        connected,
        status: json?.status ?? computedStatus,
        stripe_account_id: json?.stripe_account_id ?? null,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
        details_submitted: detailsSubmitted,
        requirements: json?.requirements,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load Stripe status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const badge = useMemo(() => {
    const s = status?.status || 'not_connected';
    switch (s) {
      case 'connected':
        return { text: 'Connected', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'pending':
        return { text: 'Onboarding in progress', cls: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'restricted':
        return { text: 'Action required', cls: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { text: 'Not connected', cls: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  }, [status]);

  /**
   * THIS is the click handler.
   *
   * - If already connected: open Stripe dashboard (we need an API for that; for now just re-run onboarding link)
   * - If not connected / pending / restricted: request an onboarding link and redirect user to Stripe
   */
  async function startOnboarding() {
    setBusy(true);
    setError(null);

    try {
      // IMPORTANT: your console showed /stripe/status 404 because the route didn't exist.
      // We are standardising on /stripe/onboard (POST) returning { url }.
      const res = await fetch(`/api/admin/clubs/${clubId}/stripe/onboard`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) throw new Error(json?.error || 'Failed to start Stripe onboarding');
      if (!json?.url) throw new Error('Stripe onboarding URL missing');

      window.location.href = json.url;
    } catch (err: any) {
      setError(err?.message || 'Failed to start Stripe onboarding');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Stripe connection</h1>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${badge.cls}`}>
            {badge.text}
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Each club connects their own Stripe account. ClubStand can’t take payments for this club until Stripe is connected.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {loading ? (
          <p className="text-sm text-slate-600">Loading Stripe status…</p>
        ) : (
          <div className="space-y-3">
            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Stripe account ID" value={status?.stripe_account_id || '—'} mono />
              <Info label="Charges enabled" value={status?.charges_enabled ? 'Yes' : 'No'} />
              <Info label="Payouts enabled" value={status?.payouts_enabled ? 'Yes' : 'No'} />
              <Info label="Details submitted" value={status?.details_submitted ? 'Yes' : 'No'} />
            </div>

            {(status?.status === 'not_connected' || status?.status === 'pending' || status?.status === 'restricted') && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">This club is not ready to take payments yet.</p>
                <p className="mt-1 text-xs text-amber-900/80">
                  Complete Stripe onboarding to enable card payments and payouts.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startOnboarding}
                disabled={busy}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy
                  ? 'Opening Stripe…'
                  : status?.status === 'connected'
                  ? 'Manage / review in Stripe'
                  : status?.status === 'not_connected'
                  ? 'Connect Stripe'
                  : 'Continue onboarding'}
              </button>

              <button
                type="button"
                onClick={refresh}
                disabled={busy}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 disabled:opacity-60"
              >
                Refresh status
              </button>

              <Link
                href={`/admin/clubs/${clubId}/payments`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800"
              >
                Back to Payments
              </Link>
            </div>

            {status?.requirements?.currently_due?.length ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-800">Currently due in Stripe</p>
                <ul className="mt-2 list-disc pl-5 text-xs text-slate-700">
                  {status.requirements.currently_due.slice(0, 10).map((x: string) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
