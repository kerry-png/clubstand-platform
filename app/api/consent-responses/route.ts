// app/api/consent-responses/route.ts

import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

type IncomingResponse = {
  question_id: string;
  member_id?: string | null;
  household_id?: string | null;
  value: boolean | string | null;
};

export async function POST(req: Request) {
  const supabase = supabaseServerClient;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { club_id, responses } = body ?? {};

  if (!club_id || typeof club_id !== 'string') {
    return NextResponse.json(
      { error: 'club_id is required' },
      { status: 400 },
    );
  }

  if (!Array.isArray(responses) || responses.length === 0) {
    return NextResponse.json(
      { error: 'responses array is required' },
      { status: 400 },
    );
  }

  const rows: any[] = [];

  for (const r of responses as IncomingResponse[]) {
    if (!r.question_id) continue;

    // Must have either member_id or household_id (or both, in theory)
    if (!r.member_id && !r.household_id) continue;

    rows.push({
      club_id,
      question_id: r.question_id,
      member_id: r.member_id ?? null,
      household_id: r.household_id ?? null,
      response: { value: r.value ?? null },
      completed_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'No valid responses to save' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from('member_consent_responses')
    .insert(rows);

  if (error) {
    console.error('Failed to insert consent responses', error);
    return NextResponse.json(
      {
        error: 'Failed to save consent responses',
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const supabase = supabaseServerClient;

  const url = new URL(req.url);
  const householdId = url.searchParams.get('householdId');
  const memberId = url.searchParams.get('memberId');

  if (!householdId || !memberId) {
    return NextResponse.json(
      {
        error: 'householdId and memberId are required',
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('member_consent_responses')
    .select('question_id, response')
    .eq('household_id', householdId)
    .eq('member_id', memberId);

  if (error) {
    console.error('Failed to load consent responses', error);
    return NextResponse.json(
      {
        error: 'Failed to load consent responses',
        details: error.message,
        code: error.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    responses: data ?? [],
  });
}
