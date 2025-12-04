// app/api/admin/clubs/[clubId]/pricing-config/route.ts

import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { type ClubPricingConfig } from '@/lib/pricing/rainhill2026';

type RouteParams = {
  clubId: string;
};

function parseMembershipYear(req: Request): number {
  const url = new URL(req.url);
  const yearParam = url.searchParams.get('year');
  const fallback = 2026;
  if (!yearParam) return fallback;
  const parsed = Number(yearParam);
  return Number.isFinite(parsed) && parsed > 1900 ? parsed : fallback;
}

// GET: fetch config for club + year
export async function GET(
  req: Request,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
) {
  try {
    const supabase = supabaseServerClient;

    const rawParams: any = (context as any).params;
    const resolvedParams: RouteParams = rawParams?.then
      ? await rawParams
      : rawParams;

    const clubId = resolvedParams?.clubId;
    if (!clubId || clubId === 'undefined') {
      return NextResponse.json(
        { error: 'Missing club id in URL' },
        { status: 400 },
      );
    }

    const membershipYear = parseMembershipYear(req);

    const { data, error } = await supabase
      .from('club_pricing_config')
      .select('*')
      .eq('club_id', clubId)
      .eq('membership_year', membershipYear)
      .maybeSingle();

    if (error) {
      console.error('Admin pricing-config GET error', error);
      return NextResponse.json(
        {
          error: 'Failed to load pricing config',
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        membershipYear,
        config: data ?? null,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error('Admin pricing-config GET unexpected error', err);
    return NextResponse.json(
      {
        error: 'Unexpected error loading pricing config',
        details: err?.message ?? String(err),
      },
      { status: 500 },
    );
  }
}

// PUT: upsert config for club + year
export async function PUT(
  req: Request,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
) {
  try {
    const supabase = supabaseServerClient;

    const rawParams: any = (context as any).params;
    const resolvedParams: RouteParams = rawParams?.then
      ? await rawParams
      : rawParams;

    const clubId = resolvedParams?.clubId;
    if (!clubId || clubId === 'undefined') {
      return NextResponse.json(
        { error: 'Missing club id in URL' },
        { status: 400 },
      );
    }

    const membershipYear = parseMembershipYear(req);

    let body: Partial<ClubPricingConfig>;
    try {
      body = (await req.json()) ?? {};
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    // Coerce/whitelist fields we care about
    const configToSave: Partial<ClubPricingConfig> = {
      cutoff_month: Number(body.cutoff_month ?? 9),
      cutoff_day: Number(body.cutoff_day ?? 1),
      junior_max_age: Number(body.junior_max_age ?? 15),
      adult_min_age: Number(body.adult_min_age ?? 16),
      adult_bundle_min_age: Number(body.adult_bundle_min_age ?? 22),
      enable_adult_bundle: Boolean(
        typeof body.enable_adult_bundle === 'boolean'
          ? body.enable_adult_bundle
          : true,
      ),
      require_junior_for_adult_bundle: Boolean(
        typeof body.require_junior_for_adult_bundle === 'boolean'
          ? body.require_junior_for_adult_bundle
          : true,
      ),
      min_adults_for_bundle: Number(body.min_adults_for_bundle ?? 2),
      male_full_price_pennies: Number(
        body.male_full_price_pennies ?? 0,
      ),
      male_intermediate_price_pennies: Number(
        body.male_intermediate_price_pennies ?? 0,
      ),
      female_full_price_pennies: Number(
        body.female_full_price_pennies ?? 0,
      ),
      female_intermediate_price_pennies: Number(
        body.female_intermediate_price_pennies ?? 0,
      ),
      junior_single_price_pennies: Number(
        body.junior_single_price_pennies ?? 0,
      ),
      junior_multi_price_pennies: Number(
        body.junior_multi_price_pennies ?? 0,
      ),
      social_adult_price_pennies: Number(
        body.social_adult_price_pennies ?? 0,
      ),
      adult_bundle_price_pennies: Number(
        body.adult_bundle_price_pennies ?? 0,
      ),
    };

    const { data, error } = await supabase
      .from('club_pricing_config')
      .upsert(
        [
          {
            club_id: clubId,
            membership_year: membershipYear,
            ...configToSave,
          },
        ],
        { onConflict: 'club_id,membership_year' },
      )
      .select('*')
      .single();

    if (error) {
      console.error('Admin pricing-config PUT error', error);
      return NextResponse.json(
        {
          error: 'Failed to save pricing config',
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        membershipYear,
        config: data,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error('Admin pricing-config PUT unexpected error', err);
    return NextResponse.json(
      {
        error: 'Unexpected error saving pricing config',
        details: err?.message ?? String(err),
      },
      { status: 500 },
    );
  }
}
