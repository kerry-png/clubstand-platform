-- supabase/migrations/202609300001_add_club_sport.sql

alter table public.clubs
add column if not exists sport text;

comment on column public.clubs.sport is
'Primary sport for this club. Used to enable sport-specific ClubStand features and configuration.';