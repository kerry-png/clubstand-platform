// lib/membership/joiningPrice.ts
import type { MembershipSettings } from './rules';

export type MidSeasonTreatment = 'inherit' | 'full' | 'prorata' | 'trial' | 'manual';

function utcDate(year:number, month:number, day:number) { return new Date(Date.UTC(year, month - 1, day)); }

export function joiningTreatment(planTreatment: MidSeasonTreatment | null | undefined, settings: MembershipSettings) {
  return !planTreatment || planTreatment === 'inherit' ? settings.mid_season_treatment : planTreatment;
}

export function calculateJoiningPrice(args:{
  fullAmountPennies:number;
  billing:'annual'|'monthly';
  now:Date;
  membershipYear:number;
  settings:MembershipSettings;
  planTreatment?:MidSeasonTreatment|null;
  planTrialDays?:number|null;
}) {
  const { fullAmountPennies, billing, now, membershipYear, settings } = args;
  const treatment = joiningTreatment(args.planTreatment, settings);
  const trialDays = args.planTrialDays ?? settings.trial_days;

  // Monthly prices already charge by elapsed billing periods, so do not day-prorate them.
  if (billing === 'monthly' || treatment === 'full') return { amountPennies: fullAmountPennies, treatment, trialDays: 0, requiresManualReview: false };
  if (treatment === 'trial') return { amountPennies: 0, treatment, trialDays, requiresManualReview: false };
  if (treatment === 'manual') return { amountPennies: 0, treatment, trialDays: 0, requiresManualReview: true };

  const start = utcDate(membershipYear, settings.membership_year_start_month, settings.membership_year_start_day);
  const end = utcDate(membershipYear + 1, settings.membership_year_start_month, settings.membership_year_start_day);
  if (now <= start) return { amountPennies: fullAmountPennies, treatment, trialDays: 0, requiresManualReview: false };
  if (now >= end) return { amountPennies: 0, treatment, trialDays: 0, requiresManualReview: true };
  const total = end.getTime() - start.getTime();
  const remaining = end.getTime() - now.getTime();
  return { amountPennies: Math.max(0, Math.round(fullAmountPennies * remaining / total)), treatment, trialDays: 0, requiresManualReview: false };
}
