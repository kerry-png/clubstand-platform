# ClubStand Membership – Checkpoint 18

## CSV column mapping
- CSV onboarding no longer depends on source systems using ClubStand column names.
- First upload inspects headers and suggests common matches.
- Admin can map first name, surname, DOB, member email, responsible-adult email, relationship and an existing family/account reference.
- First/last name are the only mandatory mappings for the preview itself.

## Duplicate detection
- Preview compares imported rows with existing club members by normalised first name + surname + DOB.
- Matches are flagged as possible duplicates and are not treated as ready rows.
- This is deliberately conservative; future commit must still require a resolution (link/skip/create), not silently merge people.

## Household/account grouping preview
- If the old system provides a family/account ID, ClubStand keeps that as the strongest proposed grouping key.
- Otherwise a responsible-adult email can propose an account grouping.
- An adult's own email can propose their own account when there is no family reference.
- Postal address is never used to automatically create a household.
- Under-18 rows without a responsible adult or source family/account reference are flagged.

## Safety
- Still preview-only: no accounts, members, households or invitations are created and no email is sent.
- Existing draft import staging migration remains unapplied.

## Next
- Add explicit duplicate resolution: link existing / skip / create separately.
- Add account-group review so admins can split/merge proposed groups before commit.
- Stage reviewed rows into import batch tables.
- Keep commit and activation-email sending as separate deliberate actions.
