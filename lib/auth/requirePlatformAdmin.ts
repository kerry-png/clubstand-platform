// lib/auth/requirePlatformAdmin.ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const PLATFORM_ADMIN_EMAILS = [
  'lawlerkerry@gmail.com',
  // Add more later if needed:
  // 'kerry@peelhousedental.co.uk',
];

export async function requirePlatformAdmin(options?: { redirectTo?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    const rt = options?.redirectTo ?? '/admin/clubstand';
    redirect(`/login?redirectTo=${encodeURIComponent(rt)}`);
  }

  const isAllowed = PLATFORM_ADMIN_EMAILS.includes(user.email);

  if (!isAllowed) {
    redirect('/admin?error=access_denied');
  }

  return { user };
}
