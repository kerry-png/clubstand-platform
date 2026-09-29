# ClubStand Membership – Checkpoint 16

## Household/family pricing
- Reworked pricing into a data-driven rule list rather than one hard-coded rule of each type.
- Supports multiple nth-member/sibling discounts, scoped to selected plans.
- Supports fixed or percentage discounts.
- Supports family bundles with adult/junior requirements and/or required plans.
- Supports household caps.
- Rules have names, priorities and active/inactive state.
- Pricing endpoints now use the club's configured membership year and junior-age rule rather than calendar year / plan labels.
- Priced items retain subscription/member identity for future allocation/audit work.

## Admin
- Pricing Rules UI now allows clubs to add/remove multiple rules instead of being limited to exactly three preset rows.
- Wording deliberately describes generic family pricing, not Rainhill rules.

## Database
Draft migration: `202609250002_expand_household_pricing_rules.sql`.
Review all outstanding migrations against live Supabase before applying.

## Not done yet
- Persisting a calculated household discount allocation back to individual subscriptions.
- Rule simulator/test cases in the admin UI.
- Relationship-specific rules (e.g. spouse specifically) need a reliable household relationship model before they should be offered.
- No live database changes applied.
