import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import { isPublicToolsetId } from '@/utils/api';
import { getDialAuth, JSON_CONTENT_TYPE_HEADERS } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

interface ToolsetSignoutRequestBody {
  id?: string;
}

/**
 * POST /api/dial-toolsets/signout
 *
 * Calls DIAL Core POST /v1/ops/toolset/signout to sign out a toolset's
 * API key credentials. Credentials level must match the level used at
 * sign-in — see dial-toolsets/signin/route.ts.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-toolsets/signout: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = (await req.json()) as ToolsetSignoutRequestBody;
  if (!id) {
    warnLog('dial-toolsets/signout: missing id');
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const sdk = getDialSDK(dialApiHost);
  const { data, error, response } = await sdk.toolSetSignout({
    ...withAuthHeader(token),
    body: {
      url: id,
      authenticationType: 'API_KEY',
      credentialsLevel: isPublicToolsetId(id) ? 'USER' : 'GLOBAL',
    },
  });

  if (!response.ok) {
    errorLog(`dial-toolsets/signout: upstream error ${response.status} for ${id}`);
  }
  return NextResponse.json(data ?? error, {
    status: response.status,
    headers: JSON_CONTENT_TYPE_HEADERS,
  });
}
