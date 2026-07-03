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

const encodeDialPath = (id: string): string =>
  id
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

/**
 * POST /api/skill-validate
 *
 * Body: { deploymentId: string; url: string }
 *
 * Calls DIAL Core POST /v1/deployments/{deploymentId}/route/v1/configuration-support/skills/validate
 * with { type: 'dial-prompt', url } to check whether a prompt is a well-formed Agent Skill.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getAuth(req);
  if (!token || !dialApiHost) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { deploymentId, url } = (await req.json().catch(() => ({}))) as {
    deploymentId?: string;
    url?: string;
  };

  if (!deploymentId || !url) {
    return NextResponse.json(
      { error: 'Missing deploymentId or url' },
      { status: 400 },
    );
  }

  const dialUrl = `${dialApiHost}/v1/deployments/${encodeDialPath(deploymentId)}/route/v1/configuration-support/skills/validate`;

  const dialRes = await fetch(dialUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'dial-prompt', url: encodeDialPath(url) }),
  });

  if (dialRes.ok) {
    const data = await dialRes.json().catch(() => null);
    return NextResponse.json({ valid: true, data });
  }

  const rawBody = await dialRes.text().catch(() => '');
  let message = rawBody;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (typeof parsed === 'string') {
      message = parsed;
    } else if (parsed && typeof parsed === 'object') {
      const { message: msg, error } = parsed as {
        message?: string;
        error?: string;
      };
      message = msg ?? error ?? rawBody;
    }
  } catch {
    // rawBody is already plain text
  }

  return NextResponse.json({
    valid: false,
    message: message || `Upstream returned ${dialRes.status}`,
  });
}
