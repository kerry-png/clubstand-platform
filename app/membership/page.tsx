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

  // Default club slug (Rainhill for now, configurable later)
  const defaultClubSlug =
    process.env.NEXT_PUBLIC_DEFAULT_CLUB_SLUG ?? 'rainhill-cc';

  redirect(`/club/${defaultClubSlug}/join`);
}
