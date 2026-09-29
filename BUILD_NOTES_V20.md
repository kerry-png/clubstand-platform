# ClubStand Membership – Checkpoint 20: core membership hardening

CSV/import/email work is deliberately parked.

## Payment safety
- Stripe checkout now blocks memberships still awaiting manual review or approval.
- Rejected memberships cannot proceed to payment.
- Active trials and manual-price memberships cannot proceed to Stripe.
- Membership entitlement and payment remain deliberately separate.

## Approval / exception lifecycle
- Rejection now closes the held subscription (`cancelled`) and clears the review hold while retaining review status, administrator, date and reason.
- Approval releases the review hold as before.
- Review decisions remain audited.

## Pricing rules
- Stronger server validation for discounts, caps, bundles and plan ownership.
- Pricing rules cannot reference another club's plans.
- Added Up/Down ordering controls because bundle priority matters.
- Added optional maximum number of discounted members.
- Existing simulator remains available to test the resulting rule order.

## Membership year
- Member-facing add-subscription no longer trusts a membership year sent by the browser.
- Current membership year is derived server-side from the club's configured membership-year settings.

## Household relationships
- Member edit API accepts the relationship groundwork added in the earlier draft migration, with an explicit allow-list.
- Address remains contact information only and is not household identity.

## Still deliberately parked
- CSV import commit
- account activation emails / bulk invitations

## Database
No new migration in v20. Existing draft migrations remain unapplied and must be reviewed before live testing of features that depend on their columns.
