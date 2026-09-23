-- First controlled ClubStand membership change:
-- invitation records exist before a household is created.

create table if not exists public.membership_invitations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  season_year integer not null,
  account_holder_first_name text not null,
  account_holder_last_name text not null,
  email text not null,
  internal_note text,
  token_hash text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'opened', 'in_progress', 'completed', 'expired', 'revoked')),
  expires_at timestamptz not null,
  sent_at timestamptz,
  opened_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  revoked_at timestamptz,
  household_id uuid references public.households(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_invitations_email_normalised
    check (email = lower(btrim(email)))
);

create index if not exists membership_invitations_club_created_idx
  on public.membership_invitations (club_id, created_at desc);

create index if not exists membership_invitations_club_email_idx
  on public.membership_invitations (club_id, email);

create unique index if not exists membership_invitations_one_active_email_idx
  on public.membership_invitations (club_id, email)
  where status in ('draft', 'sent', 'opened', 'in_progress');

alter table public.membership_invitations enable row level security;

-- No browser-facing policies are added at this stage. The admin API checks the
-- signed-in club administrator, then uses the server-only service role.

comment on table public.membership_invitations is
  'Invitation-only entry into ClubStand. A household is created only after acceptance.';

