import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import { getDialAuth, JSON_CONTENT_TYPE_HEADERS } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

/**
 * GET /api/dial-files/list
 *
 * Query params:
 *   bucket      – user bucket id (required)
 *   path        – relative folder path within the bucket (default: '')
 *   permissions – pass 'true' to request permission info
 *   limit       – max items (default: 1000)
 *
 * Calls DIAL Core GET /v1/metadata/files/{bucket}/{path}/
 * The trailing slash is appended here server-side — Next.js routing strips it
 * from incoming URLs before the catch-all proxy handler can forward it.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-files/list: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const bucket = sp.get('bucket');
  const path = sp.get('path') ?? '';
  const permissions = sp.get('permissions') === 'true';
  const recursive = sp.get('recursive') === 'true';
  const limit = Number(sp.get('limit') ?? '1000');

  if (!bucket) {
    warnLog('dial-files/list: missing bucket parameter');
    return NextResponse.json({ error: 'Missing bucket' }, { status: 400 });
  }

  // Folder paths MUST end with '/'. An empty path lists the bucket root.
  const cleanPath = path.replace(/\/$/, '');
  const folderSegment = cleanPath ? `${cleanPath}/` : '';

  const sdk = getDialSDK(dialApiHost);
  const { data, error, response } = await sdk.getFileMetadata(bucket, folderSegment, {
    ...withAuthHeader(token),
    params: { query: { limit, ...(permissions && { permissions }), ...(recursive && { recursive }) } },
  });

  if (!response.ok) {
    errorLog(`dial-files/list: upstream error ${response.status} for bucket=${bucket}`);
  }
  return NextResponse.json(data ?? error, {
    status: response.status,
    headers: JSON_CONTENT_TYPE_HEADERS,
  });
}
