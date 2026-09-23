//app/api/households/create-for-admin/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // Find an admin record for this user
  const { data: admin, error: adminError } = await supabaseServerClient
    .from('club_admin_users')
    .select('club_id, email, display_name')
    .eq('email', user.email)
    .limit(1)
    .maybeSingle();

  if (adminError || !admin) {
    return NextResponse.json(
      { error: 'Not a club admin' },
      { status: 403 },
    );
  }

  // Check if a household already exists for this club + email
  const { data: existing } = await supabaseServerClient
    .from('households')
    .select('id')
    .eq('club_id', admin.club_id)
    .or(
      `primary_email.ilike.${user.email},secondary_email.ilike.${user.email}`,
    )
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ householdId: existing.id });
  }

  const householdName =
    admin.display_name ??
    user.email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase());

  const { data: household, error: insertError } =
    await supabaseServerClient
      .from('households')
      .insert({
        club_id: admin.club_id,
        name: householdName,
        primary_email: user.email,
      })
      .select('id')
      .single();

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to create household' },
      { status: 500 },
    );
  }

  return NextResponse.json({ householdId: household.id });
}
