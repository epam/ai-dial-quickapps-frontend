import { NextRequest, NextResponse } from 'next/server';

import { DIAL_HIDDEN_FOLDER_MARKER } from '@/constants/dial-files';
import { errorLog, warnLog } from '@/server/logger';
import { getDialAuth, JSON_CONTENT_TYPE_HEADERS } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

interface CreateFolderRequestBody {
  bucket?: string;
  parentPath?: string;
  name?: string;
}

/**
 * POST /api/dial-files/create-folder
 *
 * Body: { bucket, parentPath?, name }
 *
 * DIAL Core has no explicit "create folder" operation — folders are created
 * implicitly by uploading a hidden marker file inside them.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-files/create-folder: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { bucket, parentPath, name } = (await req.json()) as CreateFolderRequestBody;
  if (!bucket || !name) {
    warnLog('dial-files/create-folder: missing bucket or name');
    return NextResponse.json({ error: 'Missing bucket or name' }, { status: 400 });
  }

  const normalizedParent = parentPath ? `${parentPath.replace(/\/$/, '')}/` : '';
  const folderPath = `${normalizedParent}${name}/`;
  const markerPath = `${folderPath}${DIAL_HIDDEN_FOLDER_MARKER}`;

  const form = new FormData();
  form.append('file', new Blob([], { type: 'application/octet-stream' }), DIAL_HIDDEN_FOLDER_MARKER);

  const sdk = getDialSDK(dialApiHost);
  const { error, response } = await sdk.uploadFile(bucket, markerPath, {
    ...withAuthHeader(token),
    body: form,
  });

  if (!response.ok) {
    errorLog(`dial-files/create-folder: upstream error ${response.status} for bucket=${bucket}`);
    return NextResponse.json(error ?? { error: 'Failed to create folder' }, {
      status: response.status,
      headers: JSON_CONTENT_TYPE_HEADERS,
    });
  }

  const resourcePath = `files/${bucket}/${folderPath}`;
  return NextResponse.json(
    {
      name,
      path: resourcePath,
      bucket,
      parentPath: normalizedParent.replace(/\/$/, '') || undefined,
      folderId: `${bucket}:${resourcePath}`,
    },
    { headers: JSON_CONTENT_TYPE_HEADERS },
  );
}
