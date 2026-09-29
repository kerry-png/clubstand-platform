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
