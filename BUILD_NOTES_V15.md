# ClubStand Membership – Checkpoint 15

## Added
- Club admin membership review queue for memberships held by plan approval or manual joining rules.
- Auditable approve/reject decision fields: status, timestamp, admin user and mandatory reason.
- New subscriptions enter `review_status = pending` when manual review is required.
- Membership admin view now includes all active people, not only junior players.
- Membership junior classification in stats now uses club-configured membership rules; cricket age band remains a separate display/team concept.

## Database
Draft migration `202609250001_add_membership_approval_audit.sql`.
Review migrations 202609240001–202609250001 together against live Supabase before applying.

## Important
No live database changes have been applied.
