// app/(app)/household/[householdId]/MembershipActions.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  householdId: string;
  subscriptionId: string;
  status: string;
  autoRenews: boolean;
  hasStripeSubscription: boolean;
};

export default function MembershipActions({ householdId, subscriptionId, status, autoRenews, hasStripeSubscription }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: string) {
    if (action === 'cancel' && !window.confirm('End this membership? This does not refund any payment already collected.')) return;
    setBusy(action); setError(null);
    const res = await fetch(`/api/households/${householdId}/memberships/${subscriptionId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(json?.error || 'Could not update membership.'); return; }
    router.refresh();
  }

  if (status === 'cancelled' || status === 'expired') return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex flex-wrap justify-end gap-1">
        {status === 'active' && <button disabled={!!busy} onClick={() => act('pause')} className="rounded border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-50">Pause</button>}
        {status === 'paused' && <button disabled={!!busy} onClick={() => act('resume')} className="rounded border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-50">Resume</button>}
        <button disabled={!!busy} onClick={() => act(autoRenews ? 'disable_auto_renew' : 'enable_auto_renew')} className="rounded border border-slate-300 px-2 py-1 text-[11px] hover:bg-slate-50">
          {autoRenews ? 'Turn off renewal' : 'Auto-renew'}
        </button>
        <button disabled={!!busy || hasStripeSubscription} onClick={() => act('cancel')} title={hasStripeSubscription ? 'Recurring payment must be dealt with first' : undefined} className="rounded border border-red-200 px-2 py-1 text-[11px] text-red-700 hover:bg-red-50 disabled:opacity-40">End membership</button>
      </div>
      {hasStripeSubscription && <p className="text-[10px] text-slate-500">Recurring payment linked — payment cancellation must be handled safely first.</p>}
      {error && <p className="text-[11px] text-red-700">{error}</p>}
    </div>
  );
}
