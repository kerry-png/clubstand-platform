// app/household/[householdId]/RemoveMemberButton.tsx
'use client';

import { useState } from 'react';

type Props = {
  householdId: string;
  memberId: string;
  disabled?: boolean;
};

export default function RemoveMemberButton({
  householdId,
  memberId,
  disabled,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (disabled || loading) return;

    const confirmed = window.confirm(
      'Are you sure you want to remove this person from your household? They will no longer appear on your membership.',
    );
    if (!confirmed) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/households/${householdId}/members/${memberId}`,
        {
          method: 'DELETE',
        },
      );

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse error, we mainly care about res.ok
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.details ||
            'Failed to remove member. Please try again.',
        );
      }

      // Simple reload after successful deletion
      window.location.reload();
    } catch (err: any) {
      console.error('Remove member error', err);
      setError(
        err.message ||
          'Something went wrong removing this member. Please try again.',
      );
      setLoading(false);
    }
  }

  const isDisabled = disabled || loading;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`rounded-md border px-2 py-0.5 text-xs ${
          isDisabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
            : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
        }`}
      >
        {loading ? 'Removing…' : 'Remove'}
      </button>
      {error && (
        <p className="max-w-xs text-[11px] text-red-700">{error}</p>
      )}
    </div>
  );
}
