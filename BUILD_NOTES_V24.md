# ClubStand Membership – Checkpoint 24: Platform Admin

## ClubStand operator dashboard
- Replaced the basic operator landing page with a SaaS-level overview.
- Shows total/live/archived clubs, registered members, household accounts, active memberships, recorded membership value and estimated ClubStand transaction-fee income.
- Club money and ClubStand income are deliberately displayed separately.
- Quick view of largest clubs, Stripe connection and estimated fee contribution.
- Add Club is directly accessible.

## Club management
- Existing Add Club flow retained and integrated.
- Clubs list now includes member count, active memberships, recorded membership value, estimated ClubStand fee, Stripe state and live/archive state.
- Club detail now gives platform metrics and direct routes into club admin, modules and Stripe.
- Added archive and restore. Archive uses `clubs.is_active`; it does not delete historic members, memberships or records.

## Revenue
- Added `/admin/clubstand/revenue`.
- Shows platform-wide and per-club estimated transaction-fee income based on active membership amounts × configured club transaction fee percentage.
- Clearly labels this as an estimate, not realised accounting revenue.
- Exact Stripe application fees/refunds are NOT currently persisted, so v24 does not pretend they are.
- Fixed monthly platform fees/MRR are not shown because there is not yet a reliable billing ledger/configuration for them.

## Security
- Platform pages/actions remain behind the existing `requirePlatformAdmin` gate.
- Archive/restore is platform-admin only.

## Next finance work
To turn estimated revenue into exact business reporting, add a ClubStand platform revenue ledger populated from Stripe application-fee/refund events, plus platform subscription billing if/when the £/club pricing model is finalised.

No new database migration in v24.
