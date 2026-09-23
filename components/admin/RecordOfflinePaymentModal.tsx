// components/admin/RecordOfflinePaymentModal.tsx

"use client";

import { useMemo, useState } from "react";

type HouseholdOption = {
  id: string;
  name: string | null;
  primary_email: string | null;
  secondary_email: string | null;
};

type MemberOption = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  member_type: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  clubId: string;
  households: HouseholdOption[];
  membersByHousehold: Record<string, MemberOption[]>;
  onSaved: () => Promise<void> | void;
};

function todayYmd(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function RecordOfflinePaymentModal({
  open,
  onClose,
  clubId,
  households,
  membersByHousehold,
  onSaved,
}: Props) {
  const [householdId, setHouseholdId] = useState<string>("");
  const [memberId, setMemberId] = useState<string>("");
  const [amountPounds, setAmountPounds] = useState<string>("");
  const [method, setMethod] = useState<"cash" | "bacs" | "cheque">("bacs");
  const [paidOn, setPaidOn] = useState<string>(todayYmd());
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const householdOptions = useMemo(() => {
    return households.map((h) => {
      const members = membersByHousehold[h.id] ?? [];
      const memberNames = members
        .slice(0, 4)
        .map((m) => `${m.first_name} ${m.last_name}`)
        .join(", ");
      const moreCount = Math.max(0, members.length - 4);

      const displayName = h.name?.trim() || "Household";
      const email = h.primary_email || h.secondary_email || "";

      const labelParts = [
        displayName,
        email ? `(${email})` : null,
        memberNames
          ? `— ${memberNames}${moreCount ? ` +${moreCount}` : ""}`
          : null,
      ].filter(Boolean);

      return {
        value: h.id,
        label: labelParts.join(" "),
      };
    });
  }, [households, membersByHousehold]);

  const selectedMembers: MemberOption[] = useMemo(() => {
    if (!householdId) return [];
    return membersByHousehold[householdId] ?? [];
  }, [householdId, membersByHousehold]);

  if (!open) return null;

  async function submit() {
    setError(null);

    const pounds = Number(amountPounds);
    if (!householdId) {
      setError("Please select a household.");
      return;
    }
    if (!Number.isFinite(pounds) || pounds <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    const amount_pennies = Math.round(pounds * 100);

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/offline-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household_id: householdId,
          member_id: memberId || null,
          amount_pennies,
          method,
          paid_on: paidOn,
          reference: reference.trim() ? reference.trim() : null,
          notes: notes.trim() ? notes.trim() : null,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to record offline payment");

      setAmountPounds("");
      setReference("");
      setNotes("");
      setMemberId("");

      await onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Failed to record offline payment");
    } finally {
      setSaving(false);
    }
  }

  function memberLabel(m: MemberOption) {
    const bits = [
      `${m.first_name} ${m.last_name}`,
      m.member_type || null,
      m.status || null,
    ].filter(Boolean);
    return titleCase(bits.join(" · "));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => (saving ? null : onClose())}
      />

      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">
            Record offline payment
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            This does not change Stripe subscriptions.
          </p>
        </div>

        <div className="p-4 space-y-4 text-sm">
          {/* Household dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-700">
              Household
            </label>

            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={householdId}
              onChange={(e) => {
                setHouseholdId(e.target.value);
                setMemberId("");
              }}
              disabled={saving}
            >
              <option value="">Select a household…</option>
              {householdOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {householdId && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="font-semibold text-slate-800">
                  Members in this household
                </div>
                {selectedMembers.length === 0 ? (
                  <div className="mt-1 text-slate-600">
                    No members linked to this household yet.
                  </div>
                ) : (
                  <ul className="mt-2 grid gap-1">
                    {selectedMembers.map((m) => (
                      <li key={m.id} className="text-slate-700">
                        • {memberLabel(m)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Optional allocation */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Allocate to member (optional)
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              disabled={saving || !householdId || selectedMembers.length === 0}
            >
              <option value="">
                {householdId
                  ? "No allocation (household-level only)"
                  : "Select a household first"}
              </option>
              {selectedMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              For reporting context only. This will not change membership status.
            </p>
          </div>

          {/* Amount / method / date */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Amount (£)
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={amountPounds}
                onChange={(e) => setAmountPounds(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 85"
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Method
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                disabled={saving}
              >
                <option value="cash">Cash</option>
                <option value="bacs">BACS</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Paid on
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Reference (optional)
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">
              Notes (optional)
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white"
          >
            {saving ? "Saving…" : "Record payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
