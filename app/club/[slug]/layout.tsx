// app/club/[slug]/layout.tsx
import type { ReactNode, CSSProperties } from 'react';
import { supabaseServerClient } from '@/lib/supabaseServer';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ClubLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const supabase = supabaseServerClient;

  const { data: club, error } = await supabase
    .from('clubs')
    .select('name, logo_url, primary_color, accent_color')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('Failed to load club branding', error);
  }

  const primary = club?.primary_color || '#0d3182';
  const accent = club?.accent_color || '#f5bf23';

  const style = {
    '--club-primary': primary,
    '--club-accent': accent,
  } as CSSProperties;

  return (
    <div style={style} className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          {club?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.logo_url}
              alt={`${club.name ?? 'Club'} logo`}
              className="h-10 w-auto rounded-md border border-slate-200 bg-white object-contain"
            />
          )}
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              ClubStand Membership
            </span>
            <span className="text-lg font-semibold text-slate-900">
              {club?.name ?? 'Club'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
