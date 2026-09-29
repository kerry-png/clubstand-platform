# ClubStand Membership — Checkpoint 13.1

Cleanup and hardening checkpoint before the flexible eligibility/pricing work in v14.

## Completed
- Permissions are now enforced by default. The old global bypass only works when `CLUBSTAND_DISABLE_PERMISSIONS=true` is explicitly set for local development.
- Added missing server-side admin guards to membership plans, consent questions, dashboard stats, Stripe status and Stripe onboarding.
- Stripe price sync now requires payment-edit permission rather than view-only permission.
- Membership-plan updates are scoped to the route club ID; a plan ID from another club cannot be updated through the route.
- Household edit page/API and Stripe checkout now require authenticated household access.
- Added a member-safe consent-question endpoint; member forms no longer call the admin consent API.
- Consent rendering now respects `applies_to` (`all`, `junior`, `adult`, `parent`, `household`).
- Household dashboard consent completion now checks the response JSON correctly and only requires questions applicable to that person/context; household-level questions are checked separately.
- Add-membership and household safeguarding flows now use the shared club membership settings/rules instead of a hard-coded under-18/1-September rule.
- Legacy membership-start API now derives membership year and junior eligibility from server-side club settings and uses the authenticated user's email rather than trusting a submitted email.
- Removed hard-coded 2026 from the main admin dashboard/member stats requests; the stats API now chooses the configured active season when no year is supplied.
- Fixed checkout selecting the wrong Stripe price column names (`*_connected`).
- Membership-settings API reformatted and given enum/date/trial-length validation plus plan-management permission checks.
- Added shared consent applicability helpers.

## Deliberately retained / next work
- The older `/club/[slug]/join` journey still exists. It has been partially hardened but overlaps the newer invitation journey. Do not add new rules to both independently; v14 should converge them onto shared eligibility/pricing services or retire the legacy path once migration is safe.
- Cricket reporting still contains cricket-specific age-band labels/cut-off presentation. That belongs to the cricket/reporting module, not the generic membership eligibility engine, and should be separated rather than blindly deleted.
- Policy-version migration from v11 remains draft-only and must not be applied without checking the live schema.
- Membership-settings migration from v13 likewise needs live-schema review before applying.
- Stripe checkout currently relies on synced recurring prices. Proration/trials/manual mid-season charging need a deliberate Stripe strategy in v14 rather than ad-hoc amount changes.
- Renewal endpoint remains intentionally disabled until lifecycle rules are complete.

## Verification
A production build was attempted in the sandbox, but `npm ci` exceeded the execution limit before dependencies were installed. No successful build is claimed for this checkpoint. Run `npm install` and `npm run build` locally before deployment.
