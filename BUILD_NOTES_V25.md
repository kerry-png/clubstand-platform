# ClubStand Membership – Checkpoint 25: flexible grassroots commercial model

## Principle
ClubStand commercial pricing is now designed as club-specific data, not hard-coded product assumptions. This supports low-cost grassroots pricing, pilot clubs, complimentary periods and negotiated deals.

## Draft migration — NOT APPLIED
`202609250004_add_club_commercial_terms.sql`
- one commercial agreement per club
- trial / active / complimentary / suspended / ended
- monthly / annual / no platform charge
- platform fee
- membership transaction fee %
- start/trial/billing/end dates
- commercial notes
- module-level commercial terms groundwork for fixed, per-item and percentage charging

## Platform admin
- Added Commercial terms to each ClubStand club record.
- ClubStand operator can set a club's platform fee, monthly/annual billing, transaction percentage, trial dates and notes.
- This is deliberately platform-admin-only; ordinary club admins cannot change what they pay ClubStand.

## Payments
- Membership checkout now reads the platform-controlled commercial transaction percentage.
- Legacy club transaction fee remains a fallback during migration so existing configuration is not abruptly broken.

## Revenue dashboard
- Separates estimated platform MRR from estimated membership transaction fees.
- Annual platform charges are normalised over 12 months for MRR.
- Complimentary/trial clubs do not contribute platform MRR.
- Club membership value remains visibly separate from ClubStand income.
- Exact realised transaction revenue still requires the future Stripe revenue ledger; estimates remain labelled as estimates.

## Important
The new commercial screens and checkout lookup require the draft migration before runtime testing. Do not apply it in isolation yet; review it with the existing draft migration set first.
No prices such as £20/month or 1% have been hard-coded.
