-- Checkpoint 14: flexible per-plan eligibility and joining treatment.
-- REVIEW AGAINST LIVE SCHEMA BEFORE APPLYING.
alter table public.membership_plans
  add column if not exists minimum_age integer,
  add column if not exists maximum_age integer,
  add column if not exists requires_approval boolean not null default false,
  add column if not exists mid_season_treatment text not null default 'inherit',
  add column if not exists trial_days integer;

alter table public.membership_plans drop constraint if exists membership_plans_age_range_check;
alter table public.membership_plans add constraint membership_plans_age_range_check
  check (minimum_age is null or maximum_age is null or minimum_age <= maximum_age);
alter table public.membership_plans drop constraint if exists membership_plans_mid_season_treatment_check;
alter table public.membership_plans add constraint membership_plans_mid_season_treatment_check
  check (mid_season_treatment in ('inherit','full','prorata','trial','manual'));
alter table public.membership_plans drop constraint if exists membership_plans_trial_days_check;
alter table public.membership_plans add constraint membership_plans_trial_days_check
  check (trial_days is null or trial_days between 0 and 365);

alter table public.membership_subscriptions
  add column if not exists joining_treatment text,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists requires_manual_review boolean not null default false;

-- Explicit, auditable exception to normal eligibility. Never silently alter the plan rules.
create table if not exists public.membership_eligibility_overrides (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  plan_id uuid not null references public.membership_plans(id) on delete cascade,
  membership_year integer not null,
  reason text not null,
  authorised_by_user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists membership_eligibility_overrides_member_idx on public.membership_eligibility_overrides(member_id, membership_year);
