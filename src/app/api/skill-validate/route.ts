import { NextRequest, NextResponse } from 'next/server';

import { encodeDialPath, getDialAuth, getDialAuthHeaders } from '@/utils/server/dial-server-auth';

/**
 * POST /api/skill-validate
 *
 * Body: { deploymentId: string; url: string }
 *
 * Calls DIAL Core POST /v1/deployments/{deploymentId}/route/v1/configuration-support/skills/validate
 * with { type: 'dial-prompt', url } to check whether a prompt is a well-formed Agent Skill.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { deploymentId, url } = (await req.json().catch(() => ({}))) as {
    deploymentId?: string;
    url?: string;
  };

  if (!deploymentId || !url) {
    return NextResponse.json({ error: 'Missing deploymentId or url' }, { status: 400 });
  }

  const dialUrl = `${dialApiHost}/v1/deployments/${encodeDialPath(deploymentId)}/route/v1/configuration-support/skills/validate`;

  const dialRes = await fetch(dialUrl, {
    method: 'POST',
    headers: getDialAuthHeaders(token, { isJson: true }),
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
