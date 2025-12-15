// app/admin/clubstand/clubs/[clubId]/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import { supabaseServerClient } from '@/lib/supabaseServer';
import ClubBrandingEditorClient from './ui/ClubBrandingEditorClient';

type Props = {
  params: Promise<{ clubId: string }>;
};

export default async function ClubBrandingEditorPage({ params }: Props) {
  await requirePlatformAdmin({ redirectTo: '/admin/clubstand/clubs' });

  const { clubId } = await params;

  const { data: club, error } = await supabaseServerClient
    .from('clubs')
    .select(
      'id,name,slug,subdomain,is_active,logo_url,primary_colour,secondary_colour,accent_colour',
    )
    .eq('id', clubId)
    .maybeSingle();

  if (error) console.error('Error loading club', error);
  if (!club) return notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: 'var(--brand-primary)' }}
          >
            {club.name}
          </h1>
          <p className="text-sm text-slate-600">
            Edit colours and logo. Changes apply across the site via CSS variables.
          </p>
        </div>

        <Link
          href="/admin/clubstand/clubs"
          className="rounded-md border px-3 py-1.5 text-xs font-semibold"
        >
          Back to clubs
        </Link>
      </div>

      <ClubBrandingEditorClient club={club} />
    </div>
  );
}
