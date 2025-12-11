// app/api/admin/clubs/[clubId]/consent-questions/route.ts

import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

type RouteParams = {
  clubId?: string;
  clubID?: string;
  clubid?: string;
  id?: string;
};

const VALID_TYPES = [
  'yes_no',
  'checkbox',
  'text',
  'multi',
  'link_confirm',
] as const;

const VALID_APPLIES = [
  'all',
  'junior',
  'adult',
  'parent',
  'household',
] as const;

// Given the resolved params object (which may be undefined),
// try to find a clubId, otherwise fall back to parsing the URL:
// /api/admin/clubs/:clubId/consent-questions
function resolveClubIdFromParamsOrUrl(
  req: Request,
  params?: RouteParams,
): string | null {
  const p = params || {};

  const fromParams =
    p.clubId ??
    p.clubID ??
    p.clubid ??
    p.id ??
    null;

  if (fromParams) return fromParams;

  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    // expected: ['api', 'admin', 'clubs', ':clubId', 'consent-questions']
    const clubsIndex = segments.indexOf('clubs');
    if (clubsIndex !== -1 && segments.length > clubsIndex + 1) {
      return decodeURIComponent(segments[clubsIndex + 1]);
    }
  } catch (e) {
    console.error('Failed to parse clubId from URL', e);
  }

  return null;
}

// Helper to resolve params for Next 16 (params can be an object or a Promise)
async function resolveParams(
  context:
    | { params: RouteParams }
    | { params: Promise<RouteParams> },
): Promise<RouteParams> {
  const raw: any = (context as any).params;
  if (raw && typeof raw.then === 'function') {
    return (await raw) as RouteParams;
  }
  return (raw || {}) as RouteParams;
}

// GET: return active consent/safeguarding questions for a club
export async function GET(
  req: Request,
  context:
    | { params: RouteParams }
    | { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;
  const params = await resolveParams(context);
  const clubId = resolveClubIdFromParamsOrUrl(req, params);

  if (!clubId) {
    console.error('Safeguarding GET missing/invalid clubId', {
      params,
      url: req.url,
    });
    return NextResponse.json(
      {
        error: 'Missing or invalid clubId in route',
        details: `Could not resolve clubId from params or URL. URL was: ${req.url}`,
        code: 'INVALID_CLUB_ID',
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('club_consent_questions')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load club_consent_questions', error);
    return NextResponse.json(
      {
        error: 'Failed to load safeguarding questions',
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ questions: data ?? [] });
}

// POST: create or update a consent question
export async function POST(
  req: Request,
  context:
    | { params: RouteParams }
    | { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;
  const params = await resolveParams(context);
  const clubId = resolveClubIdFromParamsOrUrl(req, params);

  if (!clubId) {
    return NextResponse.json(
      {
        error: 'Missing or invalid clubId in route',
        details: `Could not resolve clubId from params or URL. URL was: ${req.url}`,
        code: 'INVALID_CLUB_ID',
      },
      { status: 400 },
    );
  }

  const body = await req.json();

  const {
    id,
    label,
    description,
    type,
    required,
    applies_to,
    link_url,
    is_active,
  } = body ?? {};

  if (!label || typeof label !== 'string') {
    return NextResponse.json(
      { error: 'Question label is required' },
      { status: 400 },
    );
  }

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      {
        error: 'Invalid question type',
        details: `Must be one of: ${VALID_TYPES.join(', ')}`,
      },
      { status: 400 },
    );
  }

  const applies =
    VALID_APPLIES.includes(applies_to) ? applies_to : 'all';

  const payload = {
    club_id: clubId,
    label,
    description: description ?? null,
    type,
    required: required ?? true,
    applies_to: applies,
    link_url: link_url || null,
    is_active: is_active ?? true,
  };

  if (id) {
    // Update existing
    const { data, error } = await supabase
      .from('club_consent_questions')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('club_id', clubId)
      .select('*')
      .single();

    if (error) {
      console.error('Failed to update consent question', error);
      return NextResponse.json(
        {
          error: 'Failed to update safeguarding question',
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ question: data });
  }

  // Create new – assign sort_order to end of list
  const { data: maxRow, error: maxError } = await supabase
    .from('club_consent_questions')
    .select('sort_order')
    .eq('club_id', clubId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (maxError) {
    console.error('Failed to find max sort_order', maxError);
  }

  const nextSort = (maxRow?.sort_order ?? 0) + 10; // leave gaps

  const { data, error } = await supabase
    .from('club_consent_questions')
    .insert({
      ...payload,
      sort_order: nextSort,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create consent question', error);
    return NextResponse.json(
      {
        error: 'Failed to create safeguarding question',
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ question: data });
}

// PUT: simple reorder endpoint: body = { order: Array<{ id, sort_order }> }
export async function PUT(
  req: Request,
  context:
    | { params: RouteParams }
    | { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;
  const params = await resolveParams(context);
  const clubId = resolveClubIdFromParamsOrUrl(req, params);

  if (!clubId) {
    return NextResponse.json(
      {
        error: 'Missing or invalid clubId in route',
        details: `Could not resolve clubId from params or URL. URL was: ${req.url}`,
        code: 'INVALID_CLUB_ID',
      },
      { status: 400 },
    );
  }

  const body = await req.json();
  const { order } = body ?? {};

  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json(
      { error: 'Order array is required' },
      { status: 400 },
    );
  }

  const updates = order.map((item: any) => ({
    id: item.id,
    sort_order: item.sort_order,
    club_id: clubId,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('club_consent_questions')
    .upsert(updates); // upsert on PK id

  if (error) {
    console.error('Failed to reorder consent questions', error);
    return NextResponse.json(
      {
        error: 'Failed to reorder safeguarding questions',
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
