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
