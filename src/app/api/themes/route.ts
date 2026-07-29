import { NextResponse } from 'next/server';

import { errorObjLog, warnLog } from '@/server/logger';

const rawThemesUrl = process.env.THEMES_URL;
// Ensure we always point at config.json regardless of whether the env var includes it
const THEMES_URL = rawThemesUrl
  ? rawThemesUrl.endsWith('/config.json')
    ? rawThemesUrl
    : rawThemesUrl.replace(/\/?$/, '/config.json')
  : null;

export async function GET() {
  if (!THEMES_URL) {
    return NextResponse.json({ themes: [], images: {} });
  }

  try {
    const res = await fetch(THEMES_URL, { next: { revalidate: 300 } });
    if (!res.ok) {
      warnLog(`themes: upstream returned ${res.status} for ${THEMES_URL}`);
      return NextResponse.json({ themes: [], images: {} }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    errorObjLog(error, `themes: failed to fetch themes config from ${THEMES_URL}`);
    return NextResponse.json({ themes: [], images: {} }, { status: 502 });
  }
}
