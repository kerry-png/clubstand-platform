// app/admin/clubstand/clubs/[clubId]/logo/route.ts
import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import { supabaseServerClient } from '@/lib/supabaseServer';

type Params = { clubId: string };

function safeExt(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/svg+xml') return 'svg';
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<Params> },
) {
  await requirePlatformAdmin({ redirectTo: '/admin/clubstand/clubs' });

  const { clubId } = await params;

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const ext = safeExt(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PNG, JPG, WEBP or SVG.' },
      { status: 400 },
    );
  }

  // Basic size limit (2MB) to keep things tidy
  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: 'File too large. Max 2MB.' },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const objectPath = `clubs/${clubId}/logo.${ext}`;

  // Upload (upsert so replacing is easy)
  const { error: uploadError } = await supabaseServerClient.storage
    .from('club_assets')
    .upload(objectPath, bytes, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });

  if (uploadError) {
    return NextResponse.json(
      { error: 'Upload failed', details: uploadError.message },
      { status: 400 },
    );
  }

  // Get public URL
  const { data: publicUrlData } = supabaseServerClient.storage
    .from('club_assets')
    .getPublicUrl(objectPath);

  const logoUrl = publicUrlData.publicUrl;

  // Persist to clubs table
  const { error: dbError } = await supabaseServerClient
    .from('clubs')
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq('id', clubId);

  if (dbError) {
    return NextResponse.json(
      { error: 'Saved file but failed to update club', details: dbError.message, logoUrl },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, logoUrl });
}
