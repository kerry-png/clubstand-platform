# ClubStand Membership v7 checkpoint

- Membership plans can now be configured as playing vs social/non-playing.
- Plans can be marked junior-only and household plans from the visible club-admin UI.
- Those classifications are now saved by the membership-plan API rather than being display-only database flags.
- The registration journey already uses playing/social classification when offering real club plans, so this closes an important admin-to-registration loop.
- No new Supabase migrations are applied by this build.
- Final registration database writes remain protected until the live schema baseline is reconciled.
