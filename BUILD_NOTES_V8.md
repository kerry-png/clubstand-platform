# ClubStand Membership — v8 checkpoint

## Added in v8
- Registration form fields are now stateful rather than display-only.
- Invitation ID and secure token are carried through to completion and revalidated server-side.
- Added `POST /api/memberships/complete-registration`.
- Completion validates invitation, email, selected plans and member/plan compatibility server-side.
- Completion creates household, people and pending membership subscriptions.
- Invitation is marked completed only after those records succeed.
- Added compensating rollback so records created by a failed request are removed rather than knowingly leaving a half-created household.
- Account holder remains separate from members: they are only added as a member if explicitly entered in the People stage.
- Supabase account signup is initiated using the fixed invited email.
- Payment remains deliberately separate: subscriptions are pending, ready for the payment workflow rather than charging during registration.

## Important next work
- Replace compensating rollback with a database transaction/RPC once the live Supabase schema has been baselined.
- Persist versioned forms/consents, including optional photo consent and restricted medical/welfare data.
- Add payment-frequency selection and connect Stripe to pending memberships.
- Handle existing-auth-account invitations cleanly (login/claim flow).
- Wire club-configured eligibility rules (junior cutoff date/age, household plans, trials and mid-season rules) into server-side validation.
- Harden permissions and service-role APIs.

## Build verification
Dependency installation in the build sandbox did not finish within the execution window, so a full `next build` could not be completed here. Run `npm install` then `npm run dev`/`npm run build` locally before using this checkpoint against live data.
