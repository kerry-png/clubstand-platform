# ClubStand Membership – Checkpoint 23: renewal journey completed

CSV imports and activation emails remain parked.

## Renewal progress
- Renewal now has a single progress view:
  - memberships prepared / total people
  - current required forms outstanding
  - club approvals pending
  - payment readiness
- Each prepared member shows exactly which current forms still need attention.
- Approval-required renewals show that they are waiting for the club.

## Forms and policy versions
- Renewal checks the latest published version of each required policy/form.
- An acceptance of an older version remains in history but does not satisfy a newly published required version.
- Member form links return directly to renewal.
- Added a household-level forms page so household questions can be completed without attaching them to a fake member.
- Existing household-level responses can now be loaded by the consent API/client.

## Completion/payment
- `Continue to payment` only appears once all household members have a prepared renewal, all applicable current required forms are accepted, and no approval is pending.
- Stripe checkout has a deliberate renewal mode for the next configured membership year.
- Server revalidates renewal year, complete household coverage, approval/review holds, and current policy acceptance before creating checkout.
- Current-year and future-year memberships cannot be mixed into the same renewal payment.
- Preparing renewal still charges nothing; payment is a separate final action.
- No email is sent by renewal.

## History
- Previous membership subscriptions and previous policy acceptances are not overwritten. v21 history remains the audit trail.

## Database/build
No new migration in v23. Versioned form checks depend on the existing unapplied policy-versioning migration and other earlier draft columns. These must be reviewed/applied before live testing.
This checkpoint is not claimed as build-confirmed because dependencies are not bundled in checkpoint ZIPs.
