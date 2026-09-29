# ClubStand Membership — v10 checkpoint

- Hardened final invitation registration so the API now requires a verified Supabase user session, not only possession of the invitation URL/token.
- The authenticated user's email must match the invited email before household/member records can be created.
- Existing ClubStand accounts are now handled in the invitation journey: if the invited email already has an account, the same password field signs that account in instead of trying to create a duplicate.
- New accounts continue through signup; if Supabase requires email confirmation and no session is available, registration stops cleanly and tells the user to confirm the account rather than writing membership data unauthenticated.
- The verified access token is passed only in the Authorization header to the completion API.

Still to do: existing household joining/merging, true database transaction/RPC, richer form types and policy versioning, club-configured payment routes, renew/change/cancel flows, broader admin API permission hardening, dependency/security upgrades and final UX/aesthetic polish.
