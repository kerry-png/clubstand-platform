// app/api/branding/route.ts
import { NextResponse } from 'next/server';
import { getClubFromRequest } from '@/lib/branding/getClubFromRequest';

function extractSlugFromPath(path: string | null): string | null {
  if (!path) return null;

  const parts = path.split('?')[0].split('/').filter(Boolean);

  // /club/{slug}/...
  if (parts[0] === 'club' && parts[1]) return parts[1];

  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const path = url.searchParams.get('path');
  const slug = extractSlugFromPath(path);

  const result = await getClubFromRequest(slug);

  return NextResponse.json(
    {
      club: result.club,
      branding: result.branding,
      detectedFrom: slug ? 'slug' : 'domain',
      slug,
    },
    {
      headers: {
        'Cache-Control':
          'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
