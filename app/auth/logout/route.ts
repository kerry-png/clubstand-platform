// app/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Clear the Supabase auth session
  await supabase.auth.signOut();

  const url = new URL('/', request.url);
  return NextResponse.redirect(url);
}
