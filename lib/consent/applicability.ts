// lib/consent/applicability.ts
export type ConsentContext = 'junior' | 'adult' | 'parent' | 'household';

export function consentAppliesTo(appliesTo: string | null | undefined, context: ConsentContext) {
  return !appliesTo || appliesTo === 'all' || appliesTo === context;
}

export function hasConsentAnswer(response: any): boolean {
  const value = response?.response?.value ?? response?.value;
  return value !== null && value !== undefined && value !== '';
}
