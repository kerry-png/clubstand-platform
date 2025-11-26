// app/household/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function HouseholdRedirectPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Must be logged in first
  if (!user) {
    redirect('/login?redirectTo=/household');
  }

  if (!user.email) {
    console.error('Logged-in user has no email – cannot look up household');
    redirect('/membership');
  }

  const { data: household, error } = await supabase
    .from('households')
    .select('id')
    .ilike('primary_email', user.email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Household lookup error', error);
    redirect('/membership');
  }

  if (!household) {
    // No household yet for this email → nudge them to membership form
    redirect('/membership');
  }

  // Found a household → send them to the real dashboard
  redirect(`/household/${household.id}`);
}
