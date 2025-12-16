// app/admin/clubstand/clubs/[clubId]/branding/route.ts
import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import { supabaseServerClient } from '@/lib/supabaseServer';

type Params = { clubId: string };

function clean(v: unknown) {
  const s = String(v ?? '').trim();
  return s.length ? s : null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  await requirePlatformAdmin({ redirectTo: '/admin/clubstand/clubs' });

  const { clubId } = await params;

  const body = await req.json().catch(() => ({}));

  const primary_colour = clean(body.primary_colour);
  const secondary_colour = clean(body.secondary_colour);
  const accent_colour = clean(body.accent_colour);
  const logo_url = clean(body.logo_url);

  const { error } = await supabaseServerClient
    .from('clubs')
    .update({
      primary_colour,
      secondary_colour,
      accent_colour,
      logo_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clubId);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to save branding', details: error.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
