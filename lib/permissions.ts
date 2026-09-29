// lib/permissions.ts

// Temporary global switch so we can wire permissions everywhere
// without locking ourselves out while auth is disabled.
// Secure by default. A developer may explicitly opt out locally while wiring auth.
export const PERMISSIONS_DISABLED =
  process.env.CLUBSTAND_DISABLE_PERMISSIONS === 'true';

export type ClubAdminUser = {
  id: string;
  club_id: string;
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

/**
 * Core permission helper.
 * Permissions are enforced by default. The development bypass is explicit and opt-in.
 */
function allow(
  admin: ClubAdminUser | null,
  flag: keyof ClubAdminUser,
): boolean {
  if (PERMISSIONS_DISABLED) return true;

  if (!admin) return false;
  if (admin.is_super_admin) return true;
  return Boolean(admin[flag]);
}

/* -----------------------
   PERMISSION CHECKERS
------------------------- */

export function canViewDashboard(admin: ClubAdminUser | null): boolean {
  return allow(admin, 'can_view_dashboard');
}

export function canViewJuniors(admin: ClubAdminUser | null): boolean {
  return allow(admin, 'can_view_juniors');
}

export function canEditJuniors(admin: ClubAdminUser | null): boolean {
  return allow(admin, 'can_edit_juniors');
}

export function canViewPayments(admin: ClubAdminUser | null): boolean {
  return allow(admin, 'can_view_payments');
}

export function canEditPayments(admin: ClubAdminUser | null): boolean {
  return allow(admin, 'can_edit_payments');
}

export function canManageAdmins(admin: ClubAdminUser | null): boolean {
  return allow(admin, 'can_manage_admins');
}

export function canManageMembers(admin: ClubAdminUser | null): boolean {
  return allow(admin, 'can_manage_members');
}

export function canManageSafeguarding(admin: ClubAdminUser | null): boolean {
  return allow(admin, 'can_manage_safeguarding');
}

export function canManagePlans(admin: ClubAdminUser | null): boolean {
  return allow(admin, 'can_manage_plans');
}

export function canManagePricing(admin: ClubAdminUser | null): boolean {
  return allow(admin, 'can_manage_pricing');
}
