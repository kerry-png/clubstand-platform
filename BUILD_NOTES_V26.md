# ClubStand Membership – V26 consolidation

- V25 is the baseline after comparison with Kerry's local project.
- Consolidated the seven unapplied membership/commercial draft migrations into one review migration:
  `supabase/migrations/202609290001_membership_v26_consolidated.sql`.
- Original drafts retained under `supabase/migration-drafts-archive/` for audit/reference only.
- CSV import staging tables deliberately excluded from the consolidated migration because import/email work is parked.
- Household relationship field retained because current member/admin flows use it.
- Fixed renewal checkout so a non-member account holder or a household member who is not renewing does not block everybody else's renewal payment.
- Renewal policy checks now run against the actual renewal participants.
- No migration has been applied to Supabase.
