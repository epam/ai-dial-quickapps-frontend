import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import { isPublicToolsetId } from '@/utils/api';
import { getDialAuth, JSON_CONTENT_TYPE_HEADERS } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

interface ToolsetSigninRequestBody {
  id?: string;
  apiKey?: string;
}

/**
 * POST /api/dial-toolsets/signin
 *
 * Calls DIAL Core POST /v1/ops/toolset/signin to sign in a toolset with an
 * API key. Public toolsets (`toolsets/public/...`) are signed in per-user,
 * private ones per-workspace — mirrors the level selection in
 * applyToolsetLoginResult and dialClient's mapAuthSettings.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-toolsets/signin: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id, apiKey } = (await req.json()) as ToolsetSigninRequestBody;
  if (!id || !apiKey) {
    warnLog('dial-toolsets/signin: missing id or apiKey');
    return NextResponse.json({ error: 'Missing id or apiKey' }, { status: 400 });
  }

  const sdk = getDialSDK(dialApiHost);
  const { data, error, response } = await sdk.toolsetSignin({
    ...withAuthHeader(token),
    body: {
      url: id,
      authenticationType: 'API_KEY',
      credentialsLevel: isPublicToolsetId(id) ? 'USER' : 'GLOBAL',
      apiKey,
    },
  });

  if (!response.ok) {
    errorLog(`dial-toolsets/signin: upstream error ${response.status} for ${id}`);
  }
  return NextResponse.json(data ?? error, {
    status: response.status,
    headers: JSON_CONTENT_TYPE_HEADERS,
  });
}
