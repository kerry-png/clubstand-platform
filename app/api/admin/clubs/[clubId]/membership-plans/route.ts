// app/api/admin/clubs/[clubId]/membership-plans/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

type RouteContext = {
  params: Promise<{ clubId: string }>;
};

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase URL or service role key missing in env');
  }

  return createClient<Database>(url, serviceKey);
}

// GET: list membership plans (we'll filter per-club on the client)
export async function GET(_req: Request, _ctx: RouteContext) {
  try {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error loading membership_plans', error);
      return NextResponse.json(
        {
          error: 'Failed to load membership plans',
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ plans: data ?? [] });
  } catch (err: any) {
    console.error('Service client error in membership-plans GET', err);
    return NextResponse.json(
      { error: 'Failed to load membership plans', details: err.message },
      { status: 500 },
    );
  }
}


// POST: create OR update a single plan
export async function POST(req: Request) {
  try {
    const supabase = getServiceSupabase();
    const body = await req.json();

    // For updates we don’t need club_id (we only use id),
    // for creates we’ll take club_id from the body.
    const clubId: string | undefined = body.club_id;

    // UPDATE flow – existing plan
    if (body.id) {
const planUpdate: Record<string, any> = {
  // basic identity fields editable in admin
  name: body.name,
  slug: body.slug,
  description:
    typeof body.description === 'string'
      ? body.description
      : body.description ?? null,

  // pricing settings
  allow_annual: body.allow_annual ?? false,
  allow_monthly: body.allow_monthly ?? false,
  annual_price_pennies: body.annual_price_pennies ?? null,
  monthly_price_pennies: body.monthly_price_pennies ?? null,

  // stripe
  stripe_price_id_annual: body.stripe_price_id_annual ?? null,
  stripe_price_id_monthly: body.stripe_price_id_monthly ?? null,

  // visibility & rules
  is_visible_online:
    typeof body.is_visible_online === 'boolean'
      ? body.is_visible_online
      : undefined,
  signing_fee_pennies: body.signing_fee_pennies ?? 0,
  allow_discount_codes:
    typeof body.allow_discount_codes === 'boolean'
      ? body.allow_discount_codes
      : undefined,

  is_archived:
  typeof body.is_archived === 'boolean'
    ? body.is_archived
    : undefined,

};
      const { data, error } = await supabase
        .from('membership_plans')
        .update(planUpdate)
        .eq('id', body.id) // only match by id
        .select('*')
        .single();

      if (error) {
        console.error('Error saving membership_plan (update)', error);
        return NextResponse.json(
          {
            error: 'Failed to save membership plan',
            details: error.message,
            code: error.code,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ plan: data });
    }

    // CREATE flow – new plan for this club
    if (!clubId) {
      return NextResponse.json(
        { error: 'Missing club_id in request body' },
        { status: 400 },
      );
    }

    if (!body.name || !body.slug) {
      return NextResponse.json(
        { error: 'Missing name or slug for new plan' },
        { status: 400 },
      );
    }

    const insertPayload: Database['public']['Tables']['membership_plans']['Insert'] =
      {
        club_id: clubId,
        name: body.name,
        slug: body.slug,
        description: body.description ?? null,
        // keep billing_period for backwards compat, but pricing will
        // actually come from annual/monthly fields in the new flow
        billing_period: 'annual',
        price_pennies: 0,
        is_household_plan: body.is_household_plan ?? false,
        is_player_plan: body.is_player_plan ?? true,
        is_junior_only: body.is_junior_only ?? false,
        is_visible_online: body.is_visible_online ?? false,
        max_household_members: body.max_household_members ?? null,
        sort_order: body.sort_order ?? null,
        signing_fee_pennies: body.signing_fee_pennies ?? 0,
        allow_discount_codes:
          typeof body.allow_discount_codes === 'boolean'
            ? body.allow_discount_codes
            : true,
        allow_annual: body.allow_annual ?? true,
        allow_monthly: body.allow_monthly ?? false,
        annual_price_pennies: body.annual_price_pennies ?? 0,
        monthly_price_pennies: body.monthly_price_pennies ?? null,
        stripe_price_id_annual: body.stripe_price_id_annual ?? null,
        stripe_price_id_monthly: body.stripe_price_id_monthly ?? null,
      };

    const { data, error } = await supabase
      .from('membership_plans')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating membership_plan', error);
      return NextResponse.json(
        {
          error: 'Failed to create membership plan',
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ plan: data });
  } catch (err: any) {
    console.error('Service client error in membership-plans POST', err);
    return NextResponse.json(
      {
        error: 'Failed to save membership plan',
        details: err.message,
      },
      { status: 500 },
    );
  }
}