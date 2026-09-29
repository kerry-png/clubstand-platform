# ClubStand Membership – Checkpoint 17

## Pricing simulator
- Admin can build a pretend household from live club plans and calculate the result of current active pricing rules.
- Shows individual total, rule adjustment, final household total and applied rule names.
- Simulator never creates members or payments.

## Household model groundwork
- Draft relationship field: self, spouse/partner, child, parent/guardian, grandchild, other.
- Address is explicitly not household identity.
- One member remains associated with one club household in the current model.

## CSV onboarding groundwork
- New permission-protected CSV preview endpoint and admin page.
- Flexible common header aliases.
- Preview checks names, DOBs, contact email and responsible-adult email for under-18s.
- No members/accounts/invitations are created at preview stage.
- Does not infer households merely from shared address.
- Draft import batch/row tables provide a future auditable staging area before commit/send.

## Draft migration
`202609250003_add_household_relationships_and_imports.sql`
Do not apply until all outstanding migrations have been reviewed against live Supabase.

## Next
- Map arbitrary CSV columns where automatic aliases are insufficient.
- Duplicate detection against existing club members.
- Explicit household/account grouping review.
- Commit import and invitation generation as separate deliberate actions.
