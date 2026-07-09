import { NextRequest, NextResponse } from 'next/server';

const rawThemesUrl = process.env.THEMES_URL;
const THEME_BASE_URL = rawThemesUrl
  ? rawThemesUrl.replace(/\/config\.json$/, '').replace(/\/$/, '')
  : null;

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  if (!THEME_BASE_URL) {
    return new NextResponse(null, { status: 404 });
  }

  const { path } = await params;
  const imagePath = path.map(decodeURIComponent).join('/');
  const imageUrl = `${THEME_BASE_URL}/${imagePath}`;

  try {
    const res = await fetch(imageUrl, { next: { revalidate: 3600 } });
    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const contentType = res.headers.get('content-type') ?? 'image/svg+xml';
    return new NextResponse(res.body, {
      status: 200,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
