// app/api/admin/clubs/[clubId]/consent-questions/route.ts

import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

type RouteContext = {
  params: Record<string, string | undefined>;
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

// Try params first; if that fails, parse from URL path: /api/admin/clubs/:clubId/consent-questions
function resolveClubId(req: Request, ctx: RouteContext): string | null {
  const p = ctx.params || {};

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

export async function GET(req: Request, ctx: RouteContext) {
  const supabase = supabaseServerClient;
  const clubId = resolveClubId(req, ctx);

  if (!clubId) {
    console.error('Safeguarding GET missing/invalid clubId', {
      params: ctx.params,
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

export async function POST(req: Request, ctx: RouteContext) {
  const supabase = supabaseServerClient;
  const clubId = resolveClubId(req, ctx);

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

// Simple reorder endpoint: body = { order: Array<{ id, sort_order }> }
export async function PUT(req: Request, ctx: RouteContext) {
  const supabase = supabaseServerClient;
  const clubId = resolveClubId(req, ctx);

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