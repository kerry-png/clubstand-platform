# ClubStand Membership – Checkpoint 21

CSV imports and activation emails remain parked.

## Membership history
- Added a household Membership & form history screen.
- Historic membership subscriptions remain visible by member, plan, membership year, amount and status.
- Added a household-access-protected membership-history API.
- Added a History link from the household dashboard.

## Policy / consent versioning
- Wired the previously drafted policy-version model into safeguarding/form administration.
- Creating a question publishes version 1.
- Changing the meaningful content of an existing question publishes the next immutable version.
- Saving a member/household response continues to update the current-response table, and now also appends an acceptance record against the current published version.
- Acceptance history records who accepted, which household/member it related to, response, published version and acceptance time.
- Added a household-access-protected policy-history API.
- Household history screen displays policy/form label, version, subject and acceptance date.

## Important
This functionality depends on the existing draft migration:
`202609240001_add_policy_versioning.sql`
It is still NOT applied. It must be reviewed with the other draft migrations before testing these paths against live Supabase.

## Renewal groundwork
- Membership history is now treated as first-class rather than old subscriptions being discarded.
- No automatic renewal/payment behaviour has been added yet. Renewal selection and payment remain separate future work.
- Removed a calendar-year fallback from the household dashboard's historic pricing-year display.

## Parked
- CSV import commit/review continuation
- bulk activation/invitation emails
