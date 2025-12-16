// app/admin/clubs/[clubId]/settings/admins/AdminsClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { canManageAdmins } from '@/lib/permissions';

type AdminUser = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  is_super_admin: boolean;
  can_view_juniors: boolean;
  can_edit_juniors: boolean;
  can_view_dashboard: boolean;
  can_view_payments: boolean;
  can_edit_payments: boolean;
  can_manage_admins: boolean;
  can_manage_members: boolean;
  can_manage_safeguarding: boolean;
  can_manage_plans: boolean;
  can_manage_pricing: boolean;
};

type Props = {
  clubId: string;
};

export default function AdminsClient({ clubId }: Props) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [emailInput, setEmailInput] = useState('');
  const [adding, setAdding] = useState(false);

  const canManageAdminsFlag = canManageAdmins(null); // auth wiring still TODO

  // -------------------------------
  // Load admins
  // -------------------------------
  async function loadAdmins(showLoading: boolean = false) {
    if (showLoading) {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/admins`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || 'Failed to load admins');
      }

      const data = await res.json();
      setAdmins(data.admins || []);
    } catch (err: any) {
      if (showLoading) {
        setError(err?.message || 'Failed to load admins');
      } else {
        console.error('Failed to refresh admins', err);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadAdmins(true);
  }, [clubId]);

  // -------------------------------
  // Add admin by email (save-only mode)
  // -------------------------------
  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;

    setAdding(true);

    try {
      const res = await fetch(`/api/admin/clubs/${clubId}/admins`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to add admin');
      }

      setEmailInput('');
      await loadAdmins(false); // background refresh – keep scroll position
    } catch (err: any) {
      alert(err?.message || 'Failed to add admin');
    } finally {
      setAdding(false);
    }
  }

  // -------------------------------
  // Update role/permission flags
  // -------------------------------
  async function updateAdmin(
    adminId: string,
    updates: Partial<AdminUser>,
  ) {
    try {
      const res = await fetch(
        `/api/admin/clubs/${clubId}/admins/${adminId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        },
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to update admin');
      }

      await loadAdmins(false);
    } catch (err: any) {
      alert(err?.message || 'Update failed');
    }
  }

  // -------------------------------
  // Delete admin
  // -------------------------------
  async function deleteAdmin(adminId: string) {
    if (!confirm('Are you sure you want to remove this admin?')) return;

    try {
      const res = await fetch(
        `/api/admin/clubs/${clubId}/admins/${adminId}`,
        { method: 'DELETE' },
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to delete admin');
      }

      await loadAdmins(false);
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  }

  // -------------------------------
  // Guards + loading
  // -------------------------------
  if (!canManageAdminsFlag) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        You do not have permission to manage admins for this club.
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading admins…</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {error}
      </div>
    );
  }

  // -------------------------------
  // Permission fields + descriptions
  // -------------------------------
  const permissionFields = [
    {
      key: 'can_view_dashboard',
      label: 'View dashboard',
      desc: 'See the main club dashboard and high-level stats.',
    },
    {
      key: 'can_view_juniors',
      label: 'View juniors',
      desc: 'See the juniors dashboard, age bands and player info.',
    },
    {
      key: 'can_edit_juniors',
      label: 'Edit juniors',
      desc: 'Update junior details such as status, flags and notes.',
    },
    {
      key: 'can_manage_members',
      label: 'Manage members',
      desc: 'Add or edit members and households, mark members inactive.',
    },
    {
      key: 'can_manage_safeguarding',
      label: 'Manage safeguarding',
      desc: 'View and update safeguarding-related flags and information.',
    },
    {
      key: 'can_view_payments',
      label: 'View payments',
      desc: 'See membership payments, amounts and payment history.',
    },
    {
      key: 'can_edit_payments',
      label: 'Edit payments',
      desc: 'Record manual payments, refunds or adjustments.',
    },
    {
      key: 'can_manage_plans',
      label: 'Manage plans',
      desc: 'Create and edit membership plans for this club.',
    },
    {
      key: 'can_manage_pricing',
      label: 'Manage pricing',
      desc: 'Change plan prices, discounts and bundle rules.',
    },
    {
      key: 'can_manage_admins',
      label: 'Manage admins',
      desc: 'Add or remove admins and change these permissions.',
    },
  ] as const;

  type RoleKey =
    | 'super_admin'
    | 'club_admin'
    | 'safeguarding_officer'
    | 'junior_coordinator'
    | 'treasurer';

  const ROLE_PRESETS: Record<RoleKey, Partial<AdminUser>> = {
    super_admin: {
      is_super_admin: true,
      can_view_dashboard: true,
      can_view_juniors: true,
      can_edit_juniors: true,
      can_manage_members: true,
      can_manage_safeguarding: true,
      can_view_payments: true,
      can_edit_payments: true,
      can_manage_plans: true,
      can_manage_pricing: true,
      can_manage_admins: true,
    },

    club_admin: {
      // your requested config:
      // can_manage_plans: false, can_manage_pricing: false,
      // can_edit_payments: false, can_view_safeguarding true (via juniors),
      // can_manage_safeguarding: false
      is_super_admin: false,
      can_view_dashboard: true,
      can_view_juniors: true,
      can_edit_juniors: true,
      can_manage_members: true,
      can_manage_safeguarding: false,
      can_view_payments: true,
      can_edit_payments: false,
      can_manage_plans: false,
      can_manage_pricing: false,
      can_manage_admins: true,
    },

    safeguarding_officer: {
      is_super_admin: false,
      can_view_dashboard: false,
      can_view_juniors: true,
      can_edit_juniors: false,
      can_manage_members: false,
      can_manage_safeguarding: true,
      can_view_payments: false,
      can_edit_payments: false,
      can_manage_plans: false,
      can_manage_pricing: false,
      can_manage_admins: false,
    },

    junior_coordinator: {
      is_super_admin: false,
      can_view_dashboard: true,
      can_view_juniors: true,
      can_edit_juniors: true,
      can_manage_members: false,
      can_manage_safeguarding: false,
      can_view_payments: false,
      can_edit_payments: false,
      can_manage_plans: false,
      can_manage_pricing: false,
      can_manage_admins: false,
    },

    treasurer: {
      is_super_admin: false,
      can_view_dashboard: false,
      can_view_juniors: false,
      can_edit_juniors: false,
      can_manage_members: false,
      can_manage_safeguarding: false,
      can_view_payments: true,
      can_edit_payments: true,
      can_manage_plans: false,
      can_manage_pricing: false,
      can_manage_admins: false,
    },
  };

  const ROLE_OPTIONS: { key: RoleKey; label: string }[] = [
    { key: 'super_admin', label: 'Super Admin' },
    { key: 'club_admin', label: 'Club Admin' },
    { key: 'safeguarding_officer', label: 'Safeguarding Officer' },
    { key: 'junior_coordinator', label: 'Junior Co-ordinator' },
    { key: 'treasurer', label: 'Treasurer' },
  ];

  return (
    <div className="space-y-10">
      {/* Add admin */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Add an Admin</h2>

        <form onSubmit={handleAddAdmin} className="flex gap-3">
          <input
            type="email"
            required
            className="border rounded px-3 py-2 flex-1 text-sm"
            placeholder="admin@example.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding}
            className="px-4 py-2 rounded bg-slate-900 text-white text-sm disabled:opacity-60"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>

        <p className="text-xs text-slate-500">
          You can add any e-mail address as an admin for now. We’ll link admins
          to their login accounts once auth is fully wired.
        </p>
      </section>

      {/* Admin list */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Current Admins
        </h2>

        {admins.length === 0 && (
          <p className="text-sm text-slate-600">No Admins Yet.</p>
        )}

        <div className="space-y-6">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="rounded-md border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {admin.display_name || admin.email}
                  </p>
                  <p className="text-xs text-slate-500">{admin.email}</p>
                </div>

                {admin.is_super_admin && (
                  <span className="inline-flex items-center rounded-full bg-purple-200 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                    Super Admin
                  </span>
                )}
              </div>

              {/* Quick role presets */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>Quick Role:</span>
                <select
                  defaultValue=""
                  className="border rounded px-2 py-1 text-xs"
                  onChange={(e) => {
                    const value = e.target.value as RoleKey | '';
                    if (!value) return;
                    const preset = ROLE_PRESETS[value];
                    if (!preset) return;
                    updateAdmin(admin.id, preset);
                    e.target.value = '';
                  }}
                >
                  <option value="">Choose…</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.key} value={role.key}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Permissions */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {permissionFields.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={admin[field.key]}
                      onChange={(e) =>
                        updateAdmin(admin.id, {
                          [field.key]: e.target.checked,
                        })
                      }
                    />
                    <span>
                      <span className="font-medium">{field.label}</span>
                      <span className="block text-xs text-slate-500">
                        {field.desc}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {/* Super admin toggle */}
              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={admin.is_super_admin}
                    onChange={(e) =>
                      updateAdmin(admin.id, {
                        is_super_admin: e.target.checked,
                      })
                    }
                  />
                  Super Admin
                </label>
              </div>

              {/* Delete admin */}
              <div className="mt-4">
                <button
                  onClick={() => deleteAdmin(admin.id)}
                  className="text-sm text-red-600 underline"
                >
                  Remove Admin
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Permission explanations */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">
          What these permissions mean
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li>
            <strong>View Dashboard</strong> – access the main club dashboard
            with member counts and headline stats.
          </li>
          <li>
            <strong>View Juniors</strong> – see the juniors dashboard,
            including junior lists and basic flags.
          </li>
          <li>
            <strong>Edit Juniors</strong> – change junior status, county /
            district flags and other junior-specific fields.
          </li>
          <li>
            <strong>Manage Members</strong> – update member records, including
            setting members active / inactive.
          </li>
          <li>
            <strong>Manage Safeguarding</strong> – view and edit safeguarding-
            related flags (photo consent, medical notes, etc.).
          </li>
          <li>
            <strong>View Payments</strong> – see membership payments,
            subscriptions and payment history.
          </li>
          <li>
            <strong>Edit Payments</strong> – record offline payments, amend
            notes or fix allocation issues.
          </li>
          <li>
            <strong>Manage Plans</strong> – create and edit membership plans
            for the club.
          </li>
          <li>
            <strong>Manage Pricing</strong> – change plan prices, discounts and
            bundle rules.
          </li>
          <li>
            <strong>Manage Admins</strong> – add, remove or change the
            permissions of other club admins.
          </li>
        </ul>
      </section>
    </div>
  );
}
