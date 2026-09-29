# ClubStand Membership – Checkpoint 22: renewal groundwork

CSV imports and activation emails remain parked.

## Household renewal journey
- Added `Renew memberships` from the household dashboard.
- Renewal year is derived from each club's configured membership-year start, never hard-coded.
- Existing people are reused; nobody registers again.
- For each household member ClubStand shows the current/most recent plan and eligible plans for the next membership year.
- If the existing plan remains eligible it is suggested, but the account holder can change it.
- Annual/monthly options follow the selected plan.
- If no plan is eligible for next year the UI flags the person for club review instead of inventing a choice.

## Preparing a renewal
- Added a household-protected renewal creation endpoint.
- Revalidates member, club, plan, age/eligibility, billing option and renewal year server-side.
- Prevents duplicate pending/active/paused renewal-year memberships.
- Creates a new pending subscription for the next year; historic subscription remains untouched.
- Approval-required plans enter the existing approval queue.
- Preparing a renewal does not charge money and sends no email.

## Payment safety
- Normal Stripe checkout now refuses to mix future-year prepared renewals into current-year checkout.
- A dedicated future renewal payment/opening policy can be added later when the club decides when renewal payments should open.

## Forms/consents
- Renewal preview explicitly keeps forms/consents as a separate completion stage.
- Existing v21 versioned policy history is retained; current published versions can be checked/reaccepted rather than overwriting old acceptance.

## Database
No new migration in v22.
This checkpoint still relies on earlier draft columns/migrations and is not live-ready until those migrations are reviewed/applied and the project is built/tested.
