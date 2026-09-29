// app/api/consent-responses/route.ts
import { NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/auth/householdAccess';

type IncomingResponse = {
  question_id: string;
  member_id?: string | null;
  household_id?: string | null;
  value: boolean | string | null;
};

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const { club_id, responses } = body ?? {};
  if (!club_id || !Array.isArray(responses) || responses.length === 0) {
    return NextResponse.json({ error: 'club_id and responses are required' }, { status: 400 });
  }

  const householdId = responses.find((r: IncomingResponse) => r.household_id)?.household_id;
  if (!householdId) return NextResponse.json({ error: 'household_id is required' }, { status: 400 });

  const access = await requireHouseholdAccess(householdId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.household.club_id !== club_id) return NextResponse.json({ error: 'Club mismatch.' }, { status: 400 });

  const supabase = access.supabase;
  const memberIds = [...new Set(responses.map((r: IncomingResponse) => r.member_id).filter(Boolean))] as string[];
  if (memberIds.length) {
    const { data: members } = await supabase.from('members').select('id').eq('household_id', householdId).in('id', memberIds);
    if ((members ?? []).length !== memberIds.length) return NextResponse.json({ error: 'One or more members do not belong to this household.' }, { status: 400 });
  }

  const questionIds = [...new Set(responses.map((r: IncomingResponse) => r.question_id).filter(Boolean))] as string[];
  const { data: questions } = await supabase.from('club_consent_questions').select('id,label,description,type,applies_to,required,link_url').eq('club_id', club_id).eq('is_active', true).in('id', questionIds);
  if ((questions ?? []).length !== questionIds.length) return NextResponse.json({ error: 'One or more consent questions are invalid.' }, { status: 400 });

  for (const r of responses as IncomingResponse[]) {
    if (!r.question_id) continue;
    let del = supabase.from('member_consent_responses').delete().eq('household_id', householdId).eq('question_id', r.question_id);
    del = r.member_id ? del.eq('member_id', r.member_id) : del.is('member_id', null);
    const { error: deleteError } = await del;
    if (deleteError) return NextResponse.json({ error: 'Failed to update consent response.', details: deleteError.message }, { status: 500 });

    const { error } = await supabase.from('member_consent_responses').insert({
      club_id,
      question_id: r.question_id,
      member_id: r.member_id ?? null,
      household_id: householdId,
      response: { value: r.value ?? null },
      completed_at: new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: 'Failed to save consent response.', details: error.message }, { status: 500 });

    // Preserve what was accepted at this point in time. Current responses can change;
    // policy acceptance history is append-only.
    const question:any = (questions ?? []).find((q:any) => q.id === r.question_id);
    const { data: policyVersion } = await supabase.from('club_policy_versions')
      .select('id').eq('question_id', r.question_id).order('version', { ascending: false }).limit(1).maybeSingle();
    if (policyVersion?.id) {
      const { data: userData } = await supabase.auth.getUser();
      const { error: acceptanceError } = await supabase.from('member_policy_acceptances').insert({
        club_id,
        policy_version_id: policyVersion.id,
        household_id: householdId,
        member_id: r.member_id ?? null,
        accepted_by_user_id: userData?.user?.id ?? null,
        response: { value: r.value ?? null },
        accepted_at: new Date().toISOString(),
      });
      if (acceptanceError) return NextResponse.json({ error: 'Response saved but acceptance history could not be recorded.', details: acceptanceError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const householdId = url.searchParams.get('householdId');
  const memberId = url.searchParams.get('memberId');
  if (!householdId) return NextResponse.json({ error: 'householdId is required' }, { status: 400 });

  const access = await requireHouseholdAccess(householdId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  if (memberId) {
    const { data: member } = await access.supabase.from('members').select('id').eq('id', memberId).eq('household_id', householdId).maybeSingle();
    if (!member) return NextResponse.json({ error: 'Member not found in this household.' }, { status: 404 });
  }

  let responseQuery = access.supabase.from('member_consent_responses').select('question_id, response, completed_at').eq('household_id', householdId);
  responseQuery = memberId ? responseQuery.eq('member_id', memberId) : responseQuery.is('member_id', null);
  const { data, error } = await responseQuery;
  if (error) return NextResponse.json({ error: 'Failed to load consent responses', details: error.message }, { status: 500 });
  return NextResponse.json({ responses: data ?? [] });
}
