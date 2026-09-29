# ClubStand Membership — Checkpoint 14

## Flexible eligibility foundation
- Added one shared plan eligibility evaluator for registration/server validation.
- Plans can refine the club junior/adult default with minimum/maximum age bands.
- Plans can require club approval without changing eligibility for everyone.
- Added plan-level mid-season treatment override: inherit club default, full, pro-rata, trial, manual.
- Added optional plan-specific trial days.
- Registration uses the same eligibility evaluator in the browser and on submission.
- Added an explicit audit table design for individual eligibility overrides; exceptions are records, not hidden rule changes.

## Joining price behaviour
- Annual full-price, pro-rata, trial and manual-review calculations now have a shared helper.
- Monthly billing is not day-prorated (the recurring period is already monthly).
- Trial/manual registrations create no immediate membership amount; the subscription records why.
- Approval-required plans are marked for manual review.

## Database
Draft migration: `supabase/migrations/202609240003_add_flexible_plan_eligibility.sql`.
**Do not apply blindly. Review migrations 240001–240003 against the live Supabase schema together before deployment.**

## Next
- Admin workflow to approve/reject pending memberships and create eligibility overrides.
- Household/family eligibility conditions and pricing interactions.
- Renewal eligibility using the same evaluator.
