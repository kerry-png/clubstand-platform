// lib/membership/eligibility.ts
import { ageOnDate, assessmentDateForYear, isJunior, type MembershipSettings } from './rules';

export type EligibilityPlan = {
  is_player_plan?: boolean | null;
  is_junior_only?: boolean | null;
  minimum_age?: number | null;
  maximum_age?: number | null;
  requires_approval?: boolean | null;
};

export type MemberRole = 'player' | 'supporter';

export type EligibilityResult = {
  eligible: boolean;
  age: number | null;
  junior: boolean | null;
  requiresApproval: boolean;
  reason?: string;
};

/** One eligibility decision used by registration, admin additions and renewals. */
export function evaluatePlanEligibility(args: {
  dob?: string | null;
  role: MemberRole;
  membershipYear: number;
  settings: MembershipSettings;
  plan: EligibilityPlan;
}): EligibilityResult {
  const { dob, role, membershipYear, settings, plan } = args;
  const membershipStartDate = new Date(
  Date.UTC(
    membershipYear,
    settings.membership_year_start_month - 1,
    settings.membership_year_start_day,
  ),
);

  const age = dob ? ageOnDate(dob, membershipStartDate) : null;

  const junior = dob
    ? isJunior(dob, membershipStartDate, settings)
    : null;
    
  const requiresApproval = plan.requires_approval === true;

  if (role === 'player' && plan.is_player_plan === false) return { eligible: false, age, junior, requiresApproval, reason: 'This is a non-playing membership.' };
  if (role === 'supporter' && plan.is_player_plan !== false) return { eligible: false, age, junior, requiresApproval, reason: 'This membership is for players.' };

  // Backwards-compatible junior/adult behaviour. Explicit age bands below can refine it.
  if (plan.is_junior_only === true && junior !== true) return { eligible: false, age, junior, requiresApproval, reason: 'This membership is for juniors.' };
  if (plan.is_junior_only !== true && role === 'player' && junior === true && plan.minimum_age == null && plan.maximum_age == null) {
    return { eligible: false, age, junior, requiresApproval, reason: 'Choose a junior playing membership.' };
  }

  if (plan.minimum_age != null && (age == null || age < plan.minimum_age)) return { eligible: false, age, junior, requiresApproval, reason: `Minimum age is ${plan.minimum_age}.` };
  if (plan.maximum_age != null && (age == null || age > plan.maximum_age)) return { eligible: false, age, junior, requiresApproval, reason: `Maximum age is ${plan.maximum_age}.` };

  return { eligible: true, age, junior, requiresApproval };
}
