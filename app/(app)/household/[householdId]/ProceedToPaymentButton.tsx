// app/household/[householdId]/ProceedToPaymentButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  householdId: string;
  disabled?: boolean;
};

export default function ProceedToPaymentButton({
  householdId,
  disabled,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = !!disabled || loading;

  async function handleClick() {
    if (isDisabled) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.details ||
            'Unable to start payment. Please try again.',
        );
      }

      const url = data?.url as string | undefined;
      if (!url) throw new Error('Stripe session URL missing.');

      router.push(url);
    } catch (e: any) {
      setError(e?.message || 'Payment failed to start.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`px-4 py-2 rounded text-sm font-medium text-white ${
          isDisabled
            ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
            : 'hover:brightness-90'
        }`}
        style={
          !isDisabled
            ? { backgroundColor: 'var(--brand-primary)' }
            : undefined
        }
      >
        {loading ? 'Starting secure payment…' : 'Pay online now'}
      </button>

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
