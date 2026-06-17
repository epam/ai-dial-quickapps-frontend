import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'dial_session';
const MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

interface SessionData {
  token: string;
  dialApiHost: string;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<SessionData>;
  const { token, dialApiHost } = body;

  if (!token || !dialApiHost) {
    return NextResponse.json({ error: 'Missing token or dialApiHost' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, JSON.stringify({ token, dialApiHost } satisfies SessionData), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
