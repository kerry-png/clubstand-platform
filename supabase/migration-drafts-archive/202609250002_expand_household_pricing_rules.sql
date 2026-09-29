-- Checkpoint 16: flexible household/family pricing.
-- REVIEW AGAINST LIVE SCHEMA BEFORE APPLYING.
alter table public.pricing_rules
  add column if not exists name text,
  add column if not exists discount_from_position integer,
  add column if not exists maximum_discounted_members integer,
  add column if not exists required_plan_ids uuid[],
  add column if not exists required_plan_quantities jsonb;

alter table public.pricing_rules drop constraint if exists pricing_rules_discount_from_position_check;
alter table public.pricing_rules add constraint pricing_rules_discount_from_position_check
  check (discount_from_position is null or discount_from_position >= 2);
alter table public.pricing_rules drop constraint if exists pricing_rules_maximum_discounted_members_check;
alter table public.pricing_rules add constraint pricing_rules_maximum_discounted_members_check
  check (maximum_discounted_members is null or maximum_discounted_members >= 1);

-- Clubs may need several rules of the same type (e.g. second child and third child discounts).
-- If an earlier prototype created a club/type unique constraint, remove it after confirming its live name.
-- Do not apply destructive constraint changes blindly; inspect the live schema first.
