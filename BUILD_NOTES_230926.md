# ClubStand Membership visible build — 23 Sep 2026

## What is now visible

From **Rainhill → Club Admin**, the left navigation exposes the complete Membership area:

- Dashboard
- Invitations
- Members & households
- Juniors
- Payments
- Membership setup
- Membership types & prices
- Discount & pricing rules
- Forms, policies & consents
- Roles & access

The previous build accidentally hid most of Configuration behind legacy permission flags. That is corrected here. The destination APIs still retain their own access checks; this navigation change is not intended to be the final permissions model.

## Membership setup

A new Membership Setup screen demonstrates club-level configuration for:

- invitation / approval / open joining
- whether an account holder may manage a household without being a member
- the club's definition of a junior
- the date on which age is assessed
- mid-season joining treatment (trial, pro-rata, full price or admin decision)
- default trial length
- monthly, annual and offline payment methods

These new values are deliberately browser-local in this preview. They do not alter the live Supabase database.

## ClubStand platform administration

A club now has a Modules screen covering:

- Membership (core)
- Events & tickets
- Club shop
- 100 Club
- Prize draws & raffles
- Last Man Standing
- Availability & selection
- Match fees
- Surveys & forms

Module switches are also browser-local until the platform entitlement schema is baselined against the live database.

## Registration journey

The invitation registration route has been expanded into a staged household journey. The architecture keeps these concepts separate:

**Login → Household → People → Memberships → Forms/consents → Payments**

The invited/account-holding adult does not have to become a player or social member.

## Existing functionality retained

The project already contains useful working pieces for household/member management, membership plans, pricing rules, payments/Stripe, safeguarding/consent questions, invitations and admin roles. The build reuses these rather than replacing them.

## Still to wire into production data

1. Baseline the actual Supabase schema before adding new configuration tables.
2. Persist Membership Setup and module entitlements per club.
3. Make membership eligibility data-driven from club rules and plan criteria.
4. Version policies and record exactly which version was accepted, by whom and when.
5. Complete the invitation journey so it writes household, people, memberships and acceptances atomically.
6. Connect pricing/payment selection to the registration journey.
7. Replace legacy broad admin flags with capability-based access, especially separating finance from medical/safeguarding data.
8. Upgrade deprecated Supabase auth helpers and the vulnerable Next.js version deliberately rather than with `npm audit fix --force`.

## Build verification

A production build could not be completed in the sandbox because dependency installation exceeded the execution window. Run `npm install` and `npm run dev` locally; do not apply Supabase migrations from a preview build.
