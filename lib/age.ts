// lib/age.ts
export function getAgeOnCutoff(dobIso: string, cutoff: Date): number {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return 0;

  let age = cutoff.getFullYear() - dob.getFullYear();
  const hasBirthdayAfterCutoff =
    cutoff.getMonth() < dob.getMonth() ||
    (cutoff.getMonth() === dob.getMonth() && cutoff.getDate() < dob.getDate());

  if (hasBirthdayAfterCutoff) {
    age -= 1;
  }

  return age;
}
