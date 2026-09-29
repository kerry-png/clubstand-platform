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
