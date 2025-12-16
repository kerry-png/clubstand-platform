// app/api/me/nav/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseServerClient } from '@/lib/supabaseServer';

export async function GET() {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ signedIn: false, isClubAdmin: false });
  }

  const email = user.email ?? null;

  let adminQuery = supabaseServerClient
    .from('club_admin_users')
    .select('id')
    .limit(1);

  if (user.id && email) {
    adminQuery = adminQuery.or(`user_id.eq.${user.id},email.eq.${email}`);
  } else if (user.id) {
    adminQuery = adminQuery.eq('user_id', user.id);
  } else if (email) {
    adminQuery = adminQuery.eq('email', email);
  }

  const { data, error } = await adminQuery;

  if (error) {
    // Fail safe: don’t break nav if this errors
    return NextResponse.json({ signedIn: true, isClubAdmin: false });
  }

  return NextResponse.json({
    signedIn: true,
    isClubAdmin: Array.isArray(data) && data.length > 0,
  });
}
