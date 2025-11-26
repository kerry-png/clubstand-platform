// app/membership/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function MembershipPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, send them to signup, then back here
  if (!user) {
    redirect('/signup?redirectTo=/membership');
  }

  // For v1, Rainhill only – go straight to the junior join form
  redirect('/club/rainhill/join');
}
