// lib/membership/rules.ts
export type MembershipSettings = {
  joining_route: 'invite' | 'approval' | 'open';
  allow_non_member_account_holder: boolean;
  junior_age_under: number;
  age_assessment_month: number;
  age_assessment_day: number;
  mid_season_treatment: 'full' | 'prorata' | 'trial' | 'manual';
  trial_days: number;
  allow_annual: boolean;
  allow_monthly: boolean;
  allow_offline: boolean;
  membership_year_start_month: number;
  membership_year_start_day: number;
};

export const DEFAULT_MEMBERSHIP_SETTINGS: MembershipSettings = {
  joining_route: 'invite', allow_non_member_account_holder: true,
  junior_age_under: 18, age_assessment_month: 9, age_assessment_day: 1,
  mid_season_treatment: 'manual', trial_days: 0,
  allow_annual: true, allow_monthly: true, allow_offline: true,
  membership_year_start_month: 9, membership_year_start_day: 1,
};

export function ageOnDate(dobIso: string, onDate: Date): number | null {
  const [y,m,d] = dobIso.split('-').map(Number);
  if (!y || !m || !d) return null;
  let age = onDate.getUTCFullYear() - y;
  const month = onDate.getUTCMonth() + 1;
  if (month < m || (month === m && onDate.getUTCDate() < d)) age--;
  return age;
}

export function assessmentDateForYear(year:number, s:MembershipSettings) {
  return new Date(Date.UTC(year, s.age_assessment_month - 1, s.age_assessment_day));
}

export function isJunior(dobIso:string, year:number, s:MembershipSettings): boolean | null {
  const age = ageOnDate(dobIso, assessmentDateForYear(year, s));
  return age === null ? null : age < s.junior_age_under;
}

export function currentMembershipYear(now:Date, s:MembershipSettings) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), s.membership_year_start_month - 1, s.membership_year_start_day));
  return now >= start ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}
