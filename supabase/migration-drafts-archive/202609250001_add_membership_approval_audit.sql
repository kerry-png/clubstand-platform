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
