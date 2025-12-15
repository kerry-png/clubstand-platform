// lib/admins.ts

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabaseServerClient } from '@/lib/supabaseServer';
import type { ClubAdminUser } from '@/lib/permissions';

/**
 * Load the admin record for a given user + club using the service-role client.
 */
export async function getAdminForUserAndClub(
  userId: string,
  clubId: string,
): Promise<ClubAdminUser | null> {
  const { data, error } = await supabaseServerClient
    .from('club_admin_users')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('getAdminForUserAndClub error', error);
  }

  return (data as ClubAdminUser | null) ?? null;
}

/**
 * Load the admin record for the *current logged-in user* and club.
 *
 * Uses a cookie-bound Supabase client so it works reliably
 * in server components, API routes and Next 16 dev mode.
 */
export async function getCurrentAdminForClub(
  _req: Request | null,
  clubId: string,
): Promise<ClubAdminUser | null> {
  const cookieStore = await cookies();

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError) {
    console.warn('getCurrentAdminForClub auth error', authError.message);
    return null;
  }

  if (!user) {
    return null;
  }

  // 1) Prefer a match on user_id
  const { data: byUserId, error: byUserError } = await supabaseServerClient
    .from('club_admin_users')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (byUserError && byUserError.code !== 'PGRST116') {
    console.error('getCurrentAdminForClub by user_id error', byUserError);
  }

  if (byUserId) {
    return byUserId as ClubAdminUser;
  }

  // 2) Fallback: match by email (legacy rows)
  if (user.email) {
    const { data: byEmail, error: emailError } = await supabaseServerClient
      .from('club_admin_users')
      .select('*')
      .eq('club_id', clubId)
      .eq('email', user.email)
      .maybeSingle();

    if (emailError && emailError.code !== 'PGRST116') {
      console.error('getCurrentAdminForClub by email error', emailError);
    }

    if (byEmail) {
      return byEmail as ClubAdminUser;
    }
  }

  return null;
}
