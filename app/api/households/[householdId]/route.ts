// app/api/households/[householdId]/route.ts
import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

type RouteParams = {
  householdId: string;
};

export async function PATCH(
  req: Request,
  context: { params: Promise<RouteParams> },
) {
  const supabase = supabaseServerClient;

  // Next.js 16: params is a Promise
  const { householdId } = await context.params;

  if (!householdId || householdId === 'undefined') {
    console.error('Edit household: missing householdId in params', {
      householdId,
    });
    return NextResponse.json(
      { error: 'Missing household id in URL' },
      { status: 400 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    console.error('Edit household invalid JSON', err);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const {
    name,
    primary_email,
    phone,
    address_line1,
    address_line2,
    town_city,
    postcode,
  } = body ?? {};

  if (!primary_email || typeof primary_email !== 'string') {
    return NextResponse.json(
      { error: 'Primary e-mail is required' },
      { status: 400 },
    );
  }

  const updateData: Record<string, any> = {
    primary_email: primary_email,
  };

  if (typeof name !== 'undefined') updateData.name = name;
  if (typeof phone !== 'undefined') updateData.phone = phone;
  if (typeof address_line1 !== 'undefined')
    updateData.address_line1 = address_line1;
  if (typeof address_line2 !== 'undefined')
    updateData.address_line2 = address_line2;
  if (typeof town_city !== 'undefined') updateData.town_city = town_city;
  if (typeof postcode !== 'undefined') updateData.postcode = postcode;

  const { data, error } = await supabase
    .from('households')
    .update(updateData)
    .eq('id', householdId)
    .select('id')
    .single();

  if (error || !data) {
    console.error('Edit household update error', error);
    return NextResponse.json(
      {
        error: 'Failed to update household',
        details: error?.message,
        code: error?.code,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, id: data.id });
}
