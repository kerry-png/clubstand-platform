# ClubStand Membership — v9 checkpoint

- Registration now loads membership plans and active forms/consents through an invitation-token protected registration-config endpoint.
- Forms/consents are no longer placeholder checkboxes: configured household/parent and member questions are rendered in the joining journey.
- Required responses are revalidated server-side before records are created.
- Consent responses are saved with the household/member registration and cleaned up if registration fails.
- Membership selection now records annual vs monthly billing where the plan permits it.
- Server validates the selected billing option and stores the corresponding pending subscription amount.
- Final step offers online Stripe checkout or pending/payment-later route; online checkout uses the existing Stripe Connect flow.
- Removed old Supabase environment-presence debug logging from the interest route.

Still to do: club-configured payment-route availability, richer question types, policy versioning, existing-account/household joining, true database transaction/RPC, renewals/change/cancel flows, permission hardening and aesthetic polish.
