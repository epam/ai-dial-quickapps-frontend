import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import { getDialAuth, JSON_CONTENT_TYPE_HEADERS } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

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
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-prompts/list: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const bucket = sp.get('bucket');
  const path = sp.get('path') ?? '';
  const recursive = sp.get('recursive') === 'true';
  const limit = Number(sp.get('limit') ?? '1000');

  if (!bucket) {
    warnLog('dial-prompts/list: missing bucket parameter');
    return NextResponse.json({ error: 'Missing bucket' }, { status: 400 });
  }

  const cleanPath = path.replace(/\/$/, '');
  const folderSegment = cleanPath ? `${cleanPath}/` : '';

  const sdk = getDialSDK(dialApiHost);
  const { data, error, response } = await sdk.getPromptMetadata(bucket, folderSegment, {
    ...withAuthHeader(token),
    params: { query: { limit, ...(recursive && { recursive }) } },
  });

  if (!response.ok) {
    errorLog(`dial-prompts/list: upstream error ${response.status} for bucket=${bucket}`);
  }
  return NextResponse.json(data ?? error, {
    status: response.status,
    headers: JSON_CONTENT_TYPE_HEADERS,
  });
}
