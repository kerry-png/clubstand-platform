-- supabase/migrations/202609300003_sport_architecture_v27.sql
-- V27: platform-managed sports plus per-club sport configuration.

alter table public.sports
  add column if not exists description text,
  add column if not exists capabilities jsonb not null default '[]'::jsonb;

create table if not exists public.club_sport_settings (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  sport_id uuid not null references public.sports(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.club_sport_settings (club_id, sport_id)
select c.id, c.sport_id
from public.clubs c
where c.sport_id is not null
on conflict (club_id) do update
set sport_id = excluded.sport_id,
    updated_at = now();

comment on column public.sports.capabilities is
'Platform-managed feature keys supported by this sport. Club-specific rules remain on the club.';

comment on table public.club_sport_settings is
'Sport-specific configuration for a club. Generic membership settings do not belong here.';
