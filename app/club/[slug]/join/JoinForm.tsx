// app/club/[slug]/join/JoinForm.tsx

'use client';

import React from 'react';

type Plan = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  clubId: string;
  plans: Plan[];
};

/**
 * Legacy join form stub.
 *
 * At the moment the join flow goes via:
 *   /club/[slug]/join  →  /club/[slug]/join/details  →  /household/[householdId]
 *
 * This component is kept as a no-op so the TypeScript compiler is happy.
 * If we decide to bring back a one-page junior join form later,
 * we can build it out here.
 */
export default function JoinForm(_props: Props) {
  return null;
}
