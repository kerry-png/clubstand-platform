// lib/admins.ts

import { supabaseServerClient } from '@/lib/supabaseServer';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import type { ClubAdminUser } from '@/lib/permissions';

/**
 * Load the admin record for a given user + club using the service-role client.
 *
 * This is the core helper we’ll use from API routes and server components.
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
 * This:
 *  1. Reads the Supabase auth user from cookies (SSR client)
 *  2. Tries to find a club_admin_users row for (club_id, user_id)
 *  3. If not found, falls back to (club_id, email)
 *
 * This lets older rows created by email-only still work.
 */
export async function getCurrentAdminForClub(
  _req: Request | null,
  clubId: string,
): Promise<ClubAdminUser | null> {
  const supabaseAuth = await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();

  if (authError) {
    console.error('getCurrentAdminForClub auth error', authError);
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

  // 2) Fallback: match by email, for rows created without user_id
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
