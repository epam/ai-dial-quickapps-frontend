import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'dial_session';

interface SessionData {
  token: string;
  dialApiHost: string;
}

const getDialSession = async (): Promise<SessionData | null> => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie) return null;
  try {
    return JSON.parse(cookie.value) as SessionData;
  } catch {
    return null;
  }
};

const getAuth = async (
  req: NextRequest,
): Promise<{ token?: string; dialApiHost?: string }> => {
  const jwtToken = await getToken({ req });
  if (jwtToken?.accessToken) {
    return {
      token: jwtToken.accessToken as string,
      dialApiHost: process.env.DIAL_CORE_URL,
    };
  }
  const session = await getDialSession();
  return { token: session?.token, dialApiHost: session?.dialApiHost };
};

/**
 * GET /api/dial-prompts/list
 *
 * Query params:
 *   bucket   – prompts bucket id (required, e.g. user bucket or "public")
 *   path     – relative folder path within the bucket (default: '')
 *   limit    – max items (default: 1000)
 *   recursive – pass 'true' for recursive listing
 *
 * Calls DIAL Core GET /v1/metadata/prompts/{bucket}/{path}/
 * The trailing slash is appended here server-side — Next.js routing strips it
 * from incoming URLs before the catch-all proxy handler can forward it.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getAuth(req);
  if (!token || !dialApiHost) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const bucket = sp.get('bucket');
  const path = sp.get('path') ?? '';
  const recursive = sp.get('recursive') === 'true';
  const limit = sp.get('limit') ?? '1000';

  if (!bucket) {
    return NextResponse.json({ error: 'Missing bucket' }, { status: 400 });
  }

  const cleanPath = path.replace(/\/$/, '');
  const folderSegment = cleanPath ? `${cleanPath}/` : '';
  const qs = new URLSearchParams({ limit });
  if (recursive) qs.set('recursive', 'true');

  const dialUrl = `${dialApiHost}/v1/metadata/prompts/${bucket}/${folderSegment}?${qs}`;

  const dialRes = await fetch(dialUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await dialRes.text();
  return new NextResponse(body, {
    status: dialRes.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
