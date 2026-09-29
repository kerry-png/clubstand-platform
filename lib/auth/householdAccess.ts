// lib/auth/householdAccess.ts
import 'server-only';
import { createClient } from '@/lib/supabase/server';

type AccessResult =
  | { ok: true; userId: string; email: string; household: any; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; status: 401 | 403 | 404; error: string; supabase: Awaited<ReturnType<typeof createClient>> };

export async function requireHouseholdAccess(householdId: string): Promise<AccessResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return { ok: false, status: 401, error: 'Please sign in.', supabase };

  const { data: household, error } = await supabase
    .from('households')
    .select('id, club_id, name, primary_email, secondary_email')
    .eq('id', householdId)
    .maybeSingle();

  if (error || !household) return { ok: false, status: 404, error: 'Household not found.', supabase };

  const email = user.email.trim().toLowerCase();
  const allowed = [household.primary_email, household.secondary_email]
    .filter(Boolean)
    .some((value: string) => value.trim().toLowerCase() === email);

  if (!allowed) return { ok: false, status: 403, error: 'You do not have access to this household.', supabase };

  return { ok: true, userId: user.id, email, household, supabase };
}
