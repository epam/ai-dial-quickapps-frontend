import { NextRequest, NextResponse } from 'next/server';

import {
  getDialAuth,
  getDialAuthHeaders,
  JSON_CONTENT_TYPE_HEADERS,
} from '@/utils/server/dial-server-auth';

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
    headers: getDialAuthHeaders(token),
  });

  const body = await dialRes.text();
  return new NextResponse(body, {
    status: dialRes.status,
    headers: JSON_CONTENT_TYPE_HEADERS,
  });
}
