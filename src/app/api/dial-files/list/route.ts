import { NextRequest, NextResponse } from 'next/server';

import {
  getDialAuth,
  getDialAuthHeaders,
  JSON_CONTENT_TYPE_HEADERS,
} from '@/utils/server/dial-server-auth';

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
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const bucket = sp.get('bucket');
  const path = sp.get('path') ?? '';
  const permissions = sp.get('permissions') === 'true';
  const recursive = sp.get('recursive') === 'true';
  const limit = sp.get('limit') ?? '1000';

  if (!bucket) {
    return NextResponse.json({ error: 'Missing bucket' }, { status: 400 });
  }

  // Build the DIAL Core URL.  Folder paths MUST end with '/'.
  // An empty path lists the bucket root (URL ends with bucket + '/').
  const cleanPath = path.replace(/\/$/, '');
  const folderSegment = cleanPath ? `${cleanPath}/` : '';
  const qs = new URLSearchParams({ limit });
  if (permissions) qs.set('permissions', 'true');
  if (recursive) qs.set('recursive', 'true');

  const dialUrl = `${dialApiHost}/v1/metadata/files/${bucket}/${folderSegment}?${qs}`;

  const dialRes = await fetch(dialUrl, {
    headers: getDialAuthHeaders(token),
  });

  const body = await dialRes.text();
  return new NextResponse(body, {
    status: dialRes.status,
    headers: JSON_CONTENT_TYPE_HEADERS,
  });
}
