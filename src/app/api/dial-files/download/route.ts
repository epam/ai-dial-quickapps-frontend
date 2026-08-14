import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import { getDialAuth } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

/**
 * GET /api/dial-files/download
 *
 * Query params:
 *   bucket – target bucket id (required)
 *   path   – full file path within the bucket (required)
 *
 * Streams DIAL Core's GET /v1/files/{bucket}/{path} response body through
 * unparsed (parseAs: 'stream'), since file content is arbitrary binary data.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-files/download: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const bucket = sp.get('bucket');
  const path = sp.get('path');

  if (!bucket || !path) {
    warnLog('dial-files/download: missing bucket or path parameter');
    return NextResponse.json({ error: 'Missing bucket or path' }, { status: 400 });
  }

  const sdk = getDialSDK(dialApiHost);
  const { data, response } = await sdk.downloadFile(bucket, path, {
    ...withAuthHeader(token),
    parseAs: 'stream',
  });

  if (!response.ok) {
    errorLog(`dial-files/download: upstream error ${response.status} for bucket=${bucket} path=${path}`);
    return NextResponse.json({ error: 'Download failed' }, { status: response.status });
  }

  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  const disposition = response.headers.get('content-disposition');
  if (disposition) headers.set('Content-Disposition', disposition);

  return new NextResponse(data as ReadableStream, { status: response.status, headers });
}
