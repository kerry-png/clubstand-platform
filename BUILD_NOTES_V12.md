# ClubStand Membership — Checkpoint 12

## Membership lifecycle
- Added household-authorised membership lifecycle endpoint.
- Current memberships can be paused/resumed, auto-renew switched on/off, and non-Stripe memberships ended.
- Ending a membership records an end date and prevents auto-renew.
- Stripe-backed recurring memberships are deliberately blocked from local cancellation until the Stripe cancellation path is wired, preventing ClubStand and Stripe getting out of sync.
- Household dashboard now exposes lifecycle actions and shows paused/end/renewal state.

## Household pricing/security
- Household pricing and recalculation endpoints now require authenticated household access; household IDs can no longer simply be swapped in the URL to inspect another household's pricing.
- Removed the hard-coded 2026 pricing preview. The household chooses the current/latest membership year for pricing.

## Existing household membership selection
- Adding a membership no longer assumes every person is a player: player people see player plans; non-player people see non-player plans.
- Removed the automatic “next year” assumption; until membership-year configuration is persisted server-side, the current year is used rather than silently inventing a season.

## Deliberately not completed yet
- Stripe recurring cancellation/change still needs to be implemented through Stripe before ClubStand changes the local subscription.
- Club-configured junior age/date currently exists in the UI preview but is not yet persisted to Supabase, so legacy 18-on-1-September eligibility remains in this older add-membership route. This is now isolated as a known item rather than being treated as the final rules engine.
- Full renewal creation remains disabled until membership year + billing-period persistence is reconciled with the live schema.
