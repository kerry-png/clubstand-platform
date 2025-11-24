// app/admin/memberships/page.tsx
import { supabaseServerClient } from "@/lib/supabaseServer";

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  billing_period: string;
  price_pennies: number;
  is_household_plan: boolean;
  is_player_plan: boolean;
  is_junior_only: boolean;
  is_visible_online: boolean;
  max_household_members: number | null;
  sort_order: number | null;
};

type PlanStats = Record<
  string,
  {
    total: number;
    active: number;
  }
>;

function formatPrice(pricePennies: number) {
  return `£${(pricePennies / 100).toFixed(2)}`;
}

async function getPlansAndStats() {
  const [plansRes, subsRes] = await Promise.all([
    supabaseServerClient
      .from("membership_plans")
      .select(
        "id, name, description, slug, billing_period, price_pennies, is_household_plan, is_player_plan, is_junior_only, is_visible_online, max_household_members, sort_order"
      )
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabaseServerClient
      .from("membership_subscriptions")
      .select("id, plan_id, status"),
  ]);

  const plans = (plansRes.data ?? []) as PlanRow[];
  const stats: PlanStats = {};

  if (subsRes.data) {
    for (const sub of subsRes.data as { plan_id: string; status: string }[]) {
      const key = sub.plan_id;
      if (!stats[key]) {
        stats[key] = { total: 0, active: 0 };
      }
      stats[key].total += 1;
      if (sub.status === "active") {
        stats[key].active += 1;
      }
    }
  }

  const error = plansRes.error || subsRes.error || null;

  return { plans, stats, error };
}

export default async function AdminMembershipsPage() {
  const { plans, stats, error } = await getPlansAndStats();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">
        Membership plans
      </h1>
      <p className="text-sm text-slate-600 max-w-xl">
        These plans are coming directly from your Supabase{" "}
        <code>membership_plans</code> table. The counts below show how many{" "}
        subscriptions exist per plan (including how many are currently active).
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          Error loading plans: {error.message}
        </div>
      )}

      {plans.length === 0 ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
          <p>No membership plans found yet.</p>
          <p className="mt-1">
            Once plans are created in Supabase, they will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden text-sm">
          <div className="max-h-[480px] overflow-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 border-b">Plan</th>
                  <th className="px-3 py-2 border-b">Billing</th>
                  <th className="px-3 py-2 border-b">Price</th>
                  <th className="px-3 py-2 border-b">Type</th>
                  <th className="px-3 py-2 border-b">Subs</th>
                  <th className="px-3 py-2 border-b">Flags</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => {
                  const stat = stats[p.id] || { total: 0, active: 0 };
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 border-b align-top">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.slug}
                        </div>
                        {p.description && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {p.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 border-b text-xs align-top">
                        {p.billing_period === "annual" && "Annual"}
                        {p.billing_period === "monthly" && "Monthly"}
                        {p.billing_period === "one_off" && "One-off"}
                      </td>
                      <td className="px-3 py-2 border-b text-xs align-top">
                        {formatPrice(p.price_pennies)}
                      </td>
                      <td className="px-3 py-2 border-b text-xs align-top">
                        {p.is_household_plan
                          ? "Household"
                          : p.is_player_plan
                          ? "Player"
                          : "Supporter"}
                      </td>
                      <td className="px-3 py-2 border-b text-xs align-top">
                        <div>
                          <span className="font-medium">
                            {stat.active} active
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {stat.total} total subs
                        </div>
                      </td>
                      <td className="px-3 py-2 border-b text-[11px] text-slate-600 align-top space-x-1">
                        {p.is_junior_only && (
                          <span className="inline-flex rounded-full border px-2 py-[1px]">
                            Junior
                          </span>
                        )}
                        {p.max_household_members && (
                          <span className="inline-flex rounded-full border px-2 py-[1px]">
                            Up to {p.max_household_members} per household
                          </span>
                        )}
                        {!p.is_visible_online && (
                          <span className="inline-flex rounded-full border px-2 py-[1px]">
                            Hidden online
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
