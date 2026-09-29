# ClubStand Membership — Checkpoint 13

## Rules engine foundation
- Added `club_membership_settings`: one reusable membership-rule configuration per club.
- Junior status is no longer conceptually a Rainhill hard-code: clubs configure both the age threshold and assessment date.
- Membership year start is configurable independently.
- Joining route, non-member account-holder rule, mid-season treatment/trial days and allowed payment routes are club settings.
- Added shared rule helpers in `lib/membership/rules.ts` so registration and later renewal/change flows can use the same calculation.
- Membership Setup now loads/saves central club configuration once the migration is applied; until then it safely falls back to browser preview storage.
- Invitation registration now receives the club settings and filters junior/adult plans using the configured rule.
- Server-side completion independently re-checks junior eligibility and club-wide payment methods; the browser cannot bypass the rule.
- Corrected inconsistent use of `is_junior_plan` vs the existing `is_junior_only` plan field in the new registration flow.

## Deliberately not applied
`202609240002_add_club_membership_settings.sql` is included but has NOT been applied to the live Supabase database.

## Next
Plan-level eligibility beyond junior/adult (age bands, approval/override, family/household conditions), mid-season pricing behaviour, and replacing the remaining legacy 18/1-September checks in old membership routes with the shared engine.
