// app/api/clubs/[clubId]/consent-questions/route.ts
import { NextResponse } from 'next/server';
import { requireHouseholdAccess } from '@/lib/auth/householdAccess';

export async function GET(req: Request, { params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const householdId = new URL(req.url).searchParams.get('householdId');
  if (!householdId) return NextResponse.json({ error: 'Missing household id.' }, { status: 400 });

  const access = await requireHouseholdAccess(householdId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.household.club_id !== clubId) return NextResponse.json({ error: 'Household does not belong to this club.' }, { status: 403 });

  const { data, error } = await access.supabase
    .from('club_consent_questions')
    .select('id,club_id,label,description,type,required,applies_to,link_url,sort_order,is_active')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: 'Could not load club forms and consents.' }, { status: 500 });
  return NextResponse.json({ questions: data ?? [] });
}
