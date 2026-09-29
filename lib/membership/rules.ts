// lib/membership/rules.ts

export type MembershipSettings = {
  joining_route: 'invite' | 'approval' | 'open';
  allow_non_member_account_holder: boolean;

  // A person is a junior while their actual age is below this threshold.
  junior_age_under: number;

  // Club/sport age-group cut-off.
  // For example, cricket can use 31 August to determine the following season's
  // playing age group.
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
  joining_route: 'invite',
  allow_non_member_account_holder: true,

  junior_age_under: 18,

  // Default sport age-group cut-off.
  age_assessment_month: 8,
  age_assessment_day: 31,

  mid_season_treatment: 'manual',
  trial_days: 0,

  allow_annual: true,
  allow_monthly: true,
  allow_offline: true,

  membership_year_start_month: 9,
  membership_year_start_day: 1,
};

export function ageOnDate(dobIso: string, onDate: Date): number | null {
  const [y, m, d] = dobIso.split('-').map(Number);

  if (!y || !m || !d) return null;

  let age = onDate.getUTCFullYear() - y;
  const month = onDate.getUTCMonth() + 1;

  if (month < m || (month === m && onDate.getUTCDate() < d)) {
    age--;
  }

  return age;
}

/**
 * The club/sport age-group assessment date for a given year.
 *
 * This is NOT used to decide whether somebody is currently a junior.
 */
export function assessmentDateForYear(
  year: number,
  s: MembershipSettings,
): Date {
  return new Date(
    Date.UTC(
      year,
      s.age_assessment_month - 1,
      s.age_assessment_day,
    ),
  );
}

/**
 * Is the person a junior on a particular date?
 *
 * Junior status follows their real age on that date rather than the
 * club/sport playing-age cut-off.
 */
export function isJunior(
  dobIso: string,
  onDate: Date,
  s: MembershipSettings,
): boolean | null {
  const age = ageOnDate(dobIso, onDate);

  return age === null ? null : age < s.junior_age_under;
}

/**
 * Age used for the club/sport's playing age-group classification.
 */
export function playingAgeForYear(
  dobIso: string,
  year: number,
  s: MembershipSettings,
): number | null {
  return ageOnDate(dobIso, assessmentDateForYear(year, s));
}

export function currentMembershipYear(
  now: Date,
  s: MembershipSettings,
): number {
  const start = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      s.membership_year_start_month - 1,
      s.membership_year_start_day,
    ),
  );

  return now >= start
    ? now.getUTCFullYear()
    : now.getUTCFullYear() - 1;
}