//app/household/[householdId]/RenewButton.tsx

'use client';

import { useState } from 'react';

type Props = {
  householdId: string;
  seasonYear?: number;
};

export function RenewButton({ householdId, seasonYear = 2026 }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const res = await fetch(
        `/api/households/${householdId}/renew?year=${seasonYear}`,
        {
          method: 'POST',
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorText =
          (data?.error as string | undefined) ||
          'There was a problem starting your renewal.';
        const detailsText =
          typeof data?.details === 'string' ? data.details : '';

        setMessage(
          detailsText
            ? `${errorText} – ${detailsText}`
            : errorText,
        );
        setLoading(false);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.message) {
        setMessage(data.message);
      }

      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setMessage(
        err?.message || 'Unexpected error starting renewal.',
      );
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? 'Preparing checkout…' : `Renew for ${seasonYear}`}
      </button>
      {message && (
        <p className="text-sm text-slate-700 whitespace-pre-wrap">
          {message}
        </p>
      )}
    </div>
  );
}
