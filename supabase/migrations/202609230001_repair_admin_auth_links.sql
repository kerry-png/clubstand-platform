-- supabase/migrations/202609230001_repair_admin_auth_links.sql
-- Align legacy ClubStand administrator records with their current Supabase Auth users.

update public.club_admin_users as admin
set user_id = auth_user.id
from auth.users as auth_user
where admin.email is not null
  and auth_user.email is not null
  and lower(btrim(admin.email)) = lower(btrim(auth_user.email))
  and admin.user_id is distinct from auth_user.id;
