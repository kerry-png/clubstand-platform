# ClubStand V27 — sport architecture

## Purpose
V27 separates the shared ClubStand membership core from sport-specific concepts before the Rainhill pilot is configured.

## Included
- Platform-managed `sports` catalogue; Create Club reads sports from data rather than hard-coded options.
- ClubStand operator page at `/admin/clubstand/sports` to add, rename and activate/deactivate sports.
- `clubs.sport_id` is the club's primary sport; platform club detail can assign/change it.
- `club_sport_settings` provides a future home for club-specific sport configuration without contaminating generic membership settings.
- `sports.capabilities` provides a future platform-managed list of sport-specific capabilities without hard-coding sport names into shared pages.
- Generic Membership Setup now contains the membership year, registration access, late-joining treatment and payment routes only.
- Removed playing-age wording from the invitation membership chooser.
- Removed obsolete Membership Setup localStorage/"migration not applied" preview fallback now that the settings table is live.

## Deliberately retained for compatibility
Legacy `junior_age_under` and `age_assessment_month/day` fields remain in `club_membership_settings` and the rules type for now because existing runtime paths still consume them. They are no longer presented as club-wide configuration in Membership Setup. Do not drop them until plan eligibility/pricing has been migrated away from the old junior/adult assumptions.

## Next milestone
Design the Cricket sport profile and migrate Rainhill membership eligibility from generic junior/adult assumptions to plan rules (Junior / Intermediate / Adult) before the controlled household pilot.
