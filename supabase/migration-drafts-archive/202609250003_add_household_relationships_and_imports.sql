-- Checkpoint 17: household relationships and CSV onboarding foundation.
-- REVIEW AGAINST LIVE SCHEMA BEFORE APPLYING.
-- Address is deliberately NOT used as household identity.


alter table public.members
  add column if not exists relationship_to_account_holder text;

alter table public.members drop constraint if exists members_relationship_to_account_holder_check;
alter table public.members add constraint members_relationship_to_account_holder_check
  check (relationship_to_account_holder is null or relationship_to_account_holder in
    ('self','spouse_partner','child','parent_guardian','grandchild','other'));

create table if not exists public.membership_import_batches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  filename text not null,
  status text not null default 'preview',
  row_count integer not null default 0,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  committed_at timestamptz
);
alter table public.membership_import_batches drop constraint if exists membership_import_batches_status_check;
alter table public.membership_import_batches add constraint membership_import_batches_status_check
  check (status in ('preview','ready','committed','cancelled','failed'));

create table if not exists public.membership_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.membership_import_batches(id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null,
  proposed_data jsonb,
  review_status text not null default 'pending',
  review_message text,
  created_at timestamptz not null default now()
);
alter table public.membership_import_rows drop constraint if exists membership_import_rows_review_status_check;
alter table public.membership_import_rows add constraint membership_import_rows_review_status_check
  check (review_status in ('ready','pending','duplicate','missing_responsible_adult','invalid','ignored'));
create unique index if not exists membership_import_rows_batch_row_idx on public.membership_import_rows(batch_id,row_number);
