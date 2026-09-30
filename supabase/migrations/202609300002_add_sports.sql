-- supabase/migrations/202609300002_add_sports.sql

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.sports (key, name)
values ('cricket', 'Cricket')
on conflict (key) do nothing;

alter table public.clubs
add column if not exists sport_id uuid references public.sports(id);

update public.clubs
set sport_id = (
  select id
  from public.sports
  where key = 'cricket'
)
where slug = 'rainhill-cc'
  and sport_id is null;

comment on table public.sports is
'Sports and activities supported by ClubStand. Managed at platform level.';

comment on column public.clubs.sport_id is
'The sport or activity configuration used by this club.';