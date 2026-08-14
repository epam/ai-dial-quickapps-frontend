import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import { getDialAuth, JSON_CONTENT_TYPE_HEADERS } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

/**
 * GET /api/dial-files/list-shared
 *
 * Calls DIAL Core POST /v1/ops/resource/share/list for resources of type
 * FILE shared with the current user.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-files/list-shared: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const sdk = getDialSDK(dialApiHost);
  const { data, error, response } = await sdk.getSharedResources({
    ...withAuthHeader(token),
    body: { resourceTypes: ['FILE'], with: 'me', includeUserInfo: true },
  });

  if (!response.ok) {
    errorLog(`dial-files/list-shared: upstream error ${response.status}`);
  }
  return NextResponse.json(data ?? error, {
    status: response.status,
    headers: JSON_CONTENT_TYPE_HEADERS,
  });
}
