# ClubStand Membership – Checkpoint 19

## CSV review & resolution
- Preview rows are now editable before import.
- Possible duplicates can be linked to the suggested existing member or deliberately imported as new / skipped.
- Existing club member list is available for duplicate linking.
- Account/household grouping can be corrected using another proposed grouping or a new explicit grouping.
- Missing/bad names, DOB/contact details can be corrected in the review screen.
- Blocking issues are recalculated as the administrator resolves rows.
- Import readiness is shown clearly.
- The Import button is deliberately disabled in v19: this checkpoint cannot create members, accounts, households or send email.

## Safety principles retained
- Shared address is not used to infer a household.
- Importing data and sending activation invitations remain separate future actions.
- Duplicate rows are never silently duplicated.
- Skipped rows are explicit administrator decisions.

## Next checkpoint
- Persist a reviewed import batch/staging rows.
- Server-side validation of every resolution.
- Transactional commit into ClubStand members/households.
- Commit must not send invitations.
- Activation/invitation sending remains a later separate action.

No database migration added in v19.
Outstanding draft migrations remain unapplied.
