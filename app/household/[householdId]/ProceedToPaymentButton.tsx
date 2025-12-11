// app/household/[householdId]/ProceedToPaymentButton.tsx
'use client';

import { useState } from 'react';

type Props = {
  householdId: string;
  disabled?: boolean;
};

export default function ProceedToPaymentButton({
  householdId,
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (disabled || loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (err) {
        console.error(
          'Failed to parse JSON from /api/payments/checkout',
          err,
        );
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.details ||
            'We could not start the payment session. Please contact the club.',
        );
      }

      const url = data?.url as string | undefined;

      if (!url) {
        throw new Error(
          'Payment session created, but no checkout URL was returned.',
        );
      }

      window.location.href = url;
    } catch (err: any) {
      console.error('ProceedToPayment error', err);
      setError(
        err.message ||
          'Something went wrong starting the payment session.',
      );
      setLoading(false);
    }
  }

  const isDisabled = disabled || loading;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`px-4 py-2 rounded text-sm text-white ${
          isDisabled
            ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
            : 'hover:brightness-90'
        }`}
        style={
          isDisabled
            ? undefined
            : { background: 'var(--brand-primary)' }
        }
      >
        {loading ? 'Starting secure payment…' : 'Pay online now'}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
