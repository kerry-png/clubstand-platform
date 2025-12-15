//app/admin/clubs/[clubId]/pricing/rules/PricingRulesClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Plan = {
  id: string;
  name: string;
  is_player_plan?: boolean;
  is_junior_only?: boolean;
};

type PricingRuleRow = {
  id: string;
  rule_type: "household_cap" | "multi_member_discount" | "bundle";
  applies_to_plan_ids: string[] | null;
  min_quantity: number | null;
  cap_amount_pennies: number | null;
  discount_amount_pennies: number | null;
  discount_percent: number | null;
  bundle_price_pennies: number | null;
  bundle_adults_required: number | null;
  bundle_juniors_required: number | null;
  bundle_juniors_any: boolean | null;
  is_exclusive: boolean;
  priority: number;
  is_active: boolean;
};

const DEFAULT_RULES: PricingRuleRow[] = [
  {
    id: "",
    rule_type: "household_cap",
    applies_to_plan_ids: null,
    min_quantity: null,
    cap_amount_pennies: null,
    discount_amount_pennies: null,
    discount_percent: null,
    bundle_price_pennies: null,
    bundle_adults_required: null,
    bundle_juniors_required: null,
    bundle_juniors_any: null,
    is_exclusive: true,
    priority: 10,
    is_active: false,
  },
  {
    id: "",
    rule_type: "multi_member_discount",
    applies_to_plan_ids: null,
    min_quantity: 2,
    cap_amount_pennies: null,
    discount_amount_pennies: 0,
    discount_percent: null,
    bundle_price_pennies: null,
    bundle_adults_required: null,
    bundle_juniors_required: null,
    bundle_juniors_any: null,
    is_exclusive: false,
    priority: 20,
    is_active: false,
  },
  {
    id: "",
    rule_type: "bundle",
    applies_to_plan_ids: null,
    min_quantity: null,
    cap_amount_pennies: null,
    discount_amount_pennies: null,
    discount_percent: null,
    bundle_price_pennies: null,
    bundle_adults_required: 2,
    bundle_juniors_required: null,
    bundle_juniors_any: true,
    is_exclusive: true,
    priority: 5,
    is_active: false,
  },
];

function poundsToPennies(v: string) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
function penniesToPounds(p: number | null | undefined) {
  if (p == null) return "";
  return (p / 100).toFixed(2).replace(/\.00$/, "");
}

export default function PricingRulesClient({ clubId }: { clubId: string }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rules, setRules] = useState<PricingRuleRow[]>(DEFAULT_RULES); // ✅ changed
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErr(null);
      setMsg(null);

      const [plansRes, rulesRes] = await Promise.all([
        fetch(`/api/admin/clubs/${clubId}/membership-plans`),
        fetch(`/api/admin/clubs/${clubId}/pricing-rules`),
      ]);

      if (!plansRes.ok) {
        const j = await plansRes.json().catch(() => null);
        throw new Error(j?.error || "Failed to load membership plans");
      }
      if (!rulesRes.ok) {
        const j = await rulesRes.json().catch(() => null);
        throw new Error(j?.error || "Failed to load pricing rules");
      }

      const plansJson = await plansRes.json();
      const rulesJson = await rulesRes.json();

      if (cancelled) return;

      setPlans(
        (plansJson?.plans ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          is_player_plan: p.is_player_plan,
          is_junior_only: p.is_junior_only,
        })),
      );

      // ✅ Always keep exactly 3 rows in state by merging existing rules into defaults
      const existing: PricingRuleRow[] = rulesJson?.rules ?? [];
      const byType = new Map(existing.map((r) => [r.rule_type, r]));
      setRules(DEFAULT_RULES.map((d) => byType.get(d.rule_type) ?? d));
    }

    load().catch((e) => setErr(e.message));

    return () => {
      cancelled = true;
    };
  }, [clubId]);

  const cap = rules.find((r) => r.rule_type === "household_cap")!;
  const multi = rules.find((r) => r.rule_type === "multi_member_discount")!;
  const bundle = rules.find((r) => r.rule_type === "bundle")!;

  const playerPlanIds = useMemo(() => {
    return plans.filter((p) => p.is_player_plan).map((p) => p.id);
  }, [plans]);

  function setRule(next: PricingRuleRow) {
    setRules((prev) => prev.map((r) => (r.rule_type === next.rule_type ? next : r)));
    setMsg(null);
    setErr(null);
  }

  function toggleExclusive(type: "household_cap" | "bundle", enabled: boolean) {
    if (type === "household_cap") {
      setRule({ ...cap, is_active: enabled });
      if (enabled) setRule({ ...bundle, is_active: false });
    } else {
      setRule({ ...bundle, is_active: enabled });
      if (enabled) setRule({ ...cap, is_active: false });
    }
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    setErr(null);

    try {
      // Basic validation
      if (cap.is_active && (!cap.cap_amount_pennies || cap.cap_amount_pennies <= 0)) {
        throw new Error("Household cap is enabled but no cap amount is set.");
      }
      if (bundle.is_active && (!bundle.bundle_price_pennies || bundle.bundle_price_pennies <= 0)) {
        throw new Error("Bundle pricing is enabled but no bundle price is set.");
      }
      if (multi.is_active) {
        const hasAmount = (multi.discount_amount_pennies ?? 0) > 0;
        const hasPercent = (multi.discount_percent ?? 0) > 0;
        if (!hasAmount && !hasPercent) throw new Error("Multi-member discount is enabled but no discount amount/percent is set.");
      }

      const res = await fetch(`/api/admin/clubs/${clubId}/pricing-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: [
            // If club hasn’t chosen scope, default cap to player plans (safer)
            cap.rule_type === "household_cap"
              ? { ...cap, applies_to_plan_ids: cap.applies_to_plan_ids ?? playerPlanIds }
              : cap,
            multi,
            bundle,
          ],
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || "Failed to save rules");

      setRules((j?.rules ?? rules) as PricingRuleRow[]);
      setMsg("Saved.");
    } catch (e: any) {
      setErr(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const planCheckboxes = (selected: string[] | null, onChange: (next: string[] | null) => void) => (
    <div className="grid gap-2 sm:grid-cols-2">
      {plans.map((p) => {
        const checked = selected ? selected.includes(p.id) : false;
        return (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                const next = new Set(selected ?? []);
                if (e.target.checked) next.add(p.id);
                else next.delete(p.id);
                onChange(Array.from(next));
              }}
            />
            {p.name}
          </label>
        );
      })}
      <button
        type="button"
        className="text-xs text-slate-600 underline"
        onClick={() => onChange(null)}
      >
        Clear selection (apply to all)
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {err && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>}
      {msg && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</div>}

      {/* Household cap */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Household cap</h2>
            <p className="text-xs text-slate-600">Limit the total membership cost per household per season.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={cap.is_active} onChange={(e) => toggleExclusive("household_cap", e.target.checked)} />
            Enabled
          </label>
        </div>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Maximum household fee (£)
            <input
              type="number"
              step="0.01"
              min={0}
              value={penniesToPounds(cap.cap_amount_pennies)}
              disabled={!cap.is_active}
              onChange={(e) => setRule({ ...cap, cap_amount_pennies: poundsToPennies(e.target.value) })}
              className="rounded border px-2 py-1 text-sm"
            />
          </label>

          <div className="text-sm">
            <div className="mb-1 font-medium">Applies to plans</div>
            {planCheckboxes(cap.applies_to_plan_ids, (next) => setRule({ ...cap, applies_to_plan_ids: next }))}
            <p className="mt-2 text-xs text-slate-500">Cap and bundle are mutually exclusive. Multi-member discounts can still apply before the cap.</p>
          </div>
        </div>
      </div>

      {/* Multi-member */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Multi-member discount</h2>
            <p className="text-xs text-slate-600">Discount applied when a household has multiple eligible memberships.</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={multi.is_active} onChange={(e) => setRule({ ...multi, is_active: e.target.checked })} />
            Enabled
          </label>
        </div>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm">
              Applies from member number
              <input
                type="number"
                min={2}
                step={1}
                value={multi.min_quantity ?? 2}
                disabled={!multi.is_active}
                onChange={(e) => setRule({ ...multi, min_quantity: Number(e.target.value) })}
                className="rounded border px-2 py-1 text-sm"
              />
              <span className="text-xs text-slate-500">Example: 2 means “second eligible member onwards”.</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                Fixed discount (£)
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={penniesToPounds(multi.discount_amount_pennies)}
                  disabled={!multi.is_active}
                  onChange={(e) => setRule({ ...multi, discount_amount_pennies: poundsToPennies(e.target.value), discount_percent: null })}
                  className="rounded border px-2 py-1 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Percentage discount (%)
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={multi.discount_percent ?? ""}
                  disabled={!multi.is_active}
                  onChange={(e) => setRule({ ...multi, discount_percent: Number(e.target.value || 0), discount_amount_pennies: 0 })}
                  className="rounded border px-2 py-1 text-sm"
                />
              </label>
            </div>
          </div>

          <div className="text-sm">
            <div className="mb-1 font-medium">Applies to plans</div>
            {planCheckboxes(multi.applies_to_plan_ids, (next) => setRule({ ...multi, applies_to_plan_ids: next }))}
            <p className="mt-2 text-xs text-slate-500">Multi-member discounts can stack with a household cap (cap is applied after this discount).</p>
          </div>
        </div>
      </div>

      {/* Bundle */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Bundle pricing</h2>
            <p className="text-xs text-slate-600">Fixed household price for a specific combination (mutually exclusive with cap).</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={bundle.is_active} onChange={(e) => toggleExclusive("bundle", e.target.checked)} />
            Enabled
          </label>
        </div>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Bundle price (£)
            <input
              type="number"
              step="0.01"
              min={0}
              value={penniesToPounds(bundle.bundle_price_pennies)}
              disabled={!bundle.is_active}
              onChange={(e) => setRule({ ...bundle, bundle_price_pennies: poundsToPennies(e.target.value) })}
              className="rounded border px-2 py-1 text-sm"
            />
          </label>

          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              Adults required
              <input
                type="number"
                min={0}
                step={1}
                value={bundle.bundle_adults_required ?? 0}
                disabled={!bundle.is_active}
                onChange={(e) => setRule({ ...bundle, bundle_adults_required: Number(e.target.value) })}
                className="w-24 rounded border px-2 py-1 text-sm"
              />
            </label>

            <label className="flex items-center gap-2">
              Juniors required
              <input
                type="number"
                min={0}
                step={1}
                value={bundle.bundle_juniors_required ?? 0}
                disabled={!bundle.is_active || !!bundle.bundle_juniors_any}
                onChange={(e) => setRule({ ...bundle, bundle_juniors_required: Number(e.target.value) })}
                className="w-24 rounded border px-2 py-1 text-sm"
              />
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!bundle.bundle_juniors_any}
                disabled={!bundle.is_active}
                onChange={(e) => setRule({ ...bundle, bundle_juniors_any: e.target.checked })}
              />
              Any juniors (at least 1)
            </label>

            <p className="text-xs text-slate-500">Bundle pricing is exclusive: if enabled, cap is disabled and multi-member discounts do not apply.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-950 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save rules"}
        </button>
      </div>
    </div>
  );
}
