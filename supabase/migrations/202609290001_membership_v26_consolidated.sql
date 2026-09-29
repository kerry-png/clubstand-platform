-- supabase/migrations/202609290001_membership_v26_consolidated.sql
-- V26 CONSOLIDATED REVIEW MIGRATION — NOT YET APPLIED.
-- Replaces the seven membership/commercial draft migrations from v11-v25.

-- supabase/migrations/202609240001_add_policy_versioning.sql
-- ClubStand Membership: immutable policy/form versions and acceptance history.
-- Review against the live Supabase schema before applying.

create table if not exists public.club_policy_versions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  question_id uuid not null references public.club_consent_questions(id) on delete cascade,
  version integer not null,
  label text not null,
  description text,
  question_type text not null,
  applies_to text not null default 'all',
  required boolean not null default true,
  link_url text,
  content_hash text,
  published_at timestamptz not null default now(),
  retired_at timestamptz,
  unique(question_id, version)
);

create table if not exists public.member_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  policy_version_id uuid not null references public.club_policy_versions(id) on delete restrict,
  household_id uuid references public.households(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  accepted_by_user_id uuid,
  response jsonb not null default '{}'::jsonb,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint policy_acceptance_subject check (household_id is not null or member_id is not null)
);

create index if not exists idx_policy_versions_club_question on public.club_policy_versions(club_id, question_id, version desc);
create index if not exists idx_policy_acceptances_household on public.member_policy_acceptances(household_id, accepted_at desc);
create index if not exists idx_policy_acceptances_member on public.member_policy_acceptances(member_id, accepted_at desc);

create index if not exists idx_policy_acceptances_version on public.member_policy_acceptances(policy_version_id, accepted_at desc);


-- Configurable membership rules per club. Rainhill is data, not application logic.
create table if not exists public.club_membership_settings (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  joining_route text not null default 'invite' check (joining_route in ('invite','approval','open')),
  allow_non_member_account_holder boolean not null default true,
  junior_age_under integer not null default 18 check (junior_age_under between 1 and 99),
  age_assessment_month integer not null default 9 check (age_assessment_month between 1 and 12),
  age_assessment_day integer not null default 1 check (age_assessment_day between 1 and 31),
  mid_season_treatment text not null default 'manual' check (mid_season_treatment in ('full','prorata','trial','manual')),
  trial_days integer not null default 0 check (trial_days between 0 and 365),
  allow_annual boolean not null default true,
  allow_monthly boolean not null default true,
  allow_offline boolean not null default true,
  membership_year_start_month integer not null default 9 check (membership_year_start_month between 1 and 12),
  membership_year_start_day integer not null default 1 check (membership_year_start_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.club_membership_settings is 'Per-club membership rules used by registration, eligibility and renewal flows.';


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


-- Checkpoint 15: auditable membership approval/review decisions.
-- REVIEW AGAINST LIVE SCHEMA BEFORE APPLYING.
alter table public.membership_subscriptions
  add column if not exists review_status text not null default 'not_required',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by_user_id uuid,
  add column if not exists review_note text;

alter table public.membership_subscriptions drop constraint if exists membership_subscriptions_review_status_check;
alter table public.membership_subscriptions add constraint membership_subscriptions_review_status_check
  check (review_status in ('not_required','pending','approved','rejected'));

create index if not exists membership_subscriptions_review_queue_idx
  on public.membership_subscriptions(club_id, review_status, requires_manual_review);


-- Checkpoint 16: flexible household/family pricing.
-- REVIEW AGAINST LIVE SCHEMA BEFORE APPLYING.
alter table public.pricing_rules
  add column if not exists name text,
  add column if not exists discount_from_position integer,
  add column if not exists maximum_discounted_members integer,
  add column if not exists required_plan_ids uuid[],
  add column if not exists required_plan_quantities jsonb;

alter table public.pricing_rules drop constraint if exists pricing_rules_discount_from_position_check;
alter table public.pricing_rules add constraint pricing_rules_discount_from_position_check
  check (discount_from_position is null or discount_from_position >= 2);
alter table public.pricing_rules drop constraint if exists pricing_rules_maximum_discounted_members_check;
alter table public.pricing_rules add constraint pricing_rules_maximum_discounted_members_check
  check (maximum_discounted_members is null or maximum_discounted_members >= 1);

-- Clubs may need several rules of the same type (e.g. second child and third child discounts).
-- If an earlier prototype created a club/type unique constraint, remove it after confirming its live name.
-- Do not apply destructive constraint changes blindly; inspect the live schema first.


-- supabase/migrations/202609250004_add_club_commercial_terms.sql
-- DRAFT / NOT APPLIED
-- ClubStand commercial terms are data so grassroots clubs can have appropriate deals.

create table if not exists public.club_commercial_terms (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial','active','complimentary','suspended','ended')),
  platform_billing_frequency text not null default 'monthly' check (platform_billing_frequency in ('monthly','annual','none')),
  platform_fee_pennies integer not null default 0 check (platform_fee_pennies >= 0),
  membership_transaction_fee_percent numeric(6,3) not null default 0 check (membership_transaction_fee_percent >= 0 and membership_transaction_fee_percent <= 100),
  starts_on date,
  trial_ends_on date,
  next_billing_on date,
  ends_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(club_id)
);

create index if not exists idx_club_commercial_terms_status
  on public.club_commercial_terms(status);

-- Per-module commercial overrides. This deliberately supports fixed, per-entry,
-- percentage or free pricing without assuming every ClubStand module is sold the same way.
create table if not exists public.club_module_commercial_terms (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  module_key text not null,
  is_enabled boolean not null default false,
  fixed_fee_pennies integer not null default 0 check (fixed_fee_pennies >= 0),
  per_item_fee_pennies integer not null default 0 check (per_item_fee_pennies >= 0),
  transaction_fee_percent numeric(6,3) not null default 0 check (transaction_fee_percent >= 0 and transaction_fee_percent <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(club_id,module_key)
);


-- Household relationship groundwork. Address never defines household identity.
alter table public.members add column if not exists relationship_to_account_holder text;
alter table public.members drop constraint if exists members_relationship_to_account_holder_check;
alter table public.members add constraint members_relationship_to_account_holder_check
 check (relationship_to_account_holder is null or relationship_to_account_holder in
 ('self','spouse_partner','child','parent_guardian','grandchild','other'));
