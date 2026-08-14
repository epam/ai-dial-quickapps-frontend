import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import { getDialAuth, JSON_CONTENT_TYPE_HEADERS } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

/**
 * PUT /api/dial-files/upload
 *
 * Query params:
 *   bucket     – target bucket id (required)
 *   path       – full file path within the bucket, e.g. "folder1/file.png" (required)
 *   uploadMode – pass 'create-only' to fail (412) instead of overwriting an existing file
 *
 * Body: multipart/form-data with a single "file" field.
 *
 * DIAL Core's PUT /v1/files/{bucket}/{path} only accepts multipart/form-data —
 * a raw body is rejected with "must have a valid content-type header to
 * decode a multipart request".
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-files/upload: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const bucket = sp.get('bucket');
  const path = sp.get('path');
  const isCreateOnly = sp.get('uploadMode') === 'create-only';

  if (!bucket || !path) {
    warnLog('dial-files/upload: missing bucket or path parameter');
    return NextResponse.json({ error: 'Missing bucket or path' }, { status: 400 });
  }

  const incomingForm = await req.formData();
  const file = incomingForm.get('file');
  if (!(file instanceof Blob)) {
    warnLog('dial-files/upload: missing file field');
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const outgoingForm = new FormData();
  outgoingForm.append('file', file, file instanceof File ? file.name : path.split('/').pop());

  const sdk = getDialSDK(dialApiHost);
  const { data, error, response } = await sdk.uploadFile(bucket, path, {
    ...withAuthHeader(token),
    ...(isCreateOnly && { params: { header: { 'If-None-Match': '*' } } }),
    body: outgoingForm,
  });

  if (!response.ok) {
    errorLog(`dial-files/upload: upstream error ${response.status} for bucket=${bucket} path=${path}`);
  }
  return NextResponse.json(data ?? error, {
    status: response.status,
    headers: JSON_CONTENT_TYPE_HEADERS,
  });
}
