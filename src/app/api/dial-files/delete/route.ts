import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import { getDialAuth, JSON_CONTENT_TYPE_HEADERS } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

interface DeleteItemDto {
  bucket: string;
  path: string;
  nodeType: 'ITEM' | 'FOLDER';
}

interface FolderChild {
  name?: string;
  nodeType?: string;
}

type DialSdk = ReturnType<typeof getDialSDK>;

const deleteFolderContents = async (
  sdk: DialSdk,
  token: string,
  bucket: string,
  folderPath: string,
): Promise<void> => {
  try {
    const { data } = await sdk.getFileMetadata(bucket, folderPath, {
      ...withAuthHeader(token),
      params: { query: { limit: 1000 } },
    });
    const children = (data as { items?: FolderChild[] } | undefined)?.items ?? [];

    await Promise.all(
      children.map(async (child) => {
        const isFolder = (child.nodeType ?? '').toLowerCase() === 'folder';
        const childName = child.name ?? '';
        const childPath = isFolder ? `${folderPath}${childName}/` : `${folderPath}${childName}`;
        if (isFolder) {
          await deleteFolderContents(sdk, token, bucket, childPath);
        }
        await sdk.deleteFile(bucket, childPath, withAuthHeader(token));
      }),
    );
  } catch {
    // best-effort — the final deleteFile call below still runs for the folder itself
  }
};

/**
 * POST /api/dial-files/delete
 *
 * Body: { items: Array<{ bucket, path, nodeType }> }
 *
 * DIAL Core has no recursive/batch delete — folders are deleted by first
 * removing all of their contents (walked via metadata listing), then
 * deleting the folder path itself.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-files/delete: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { items } = (await req.json()) as { items?: DeleteItemDto[] };
  if (!items?.length) {
    warnLog('dial-files/delete: missing items');
    return NextResponse.json({ error: 'Missing items' }, { status: 400 });
  }

  const sdk = getDialSDK(dialApiHost);

  const results = await Promise.all(
    items.map(async (item) => {
      const relPath =
        item.nodeType === 'FOLDER'
          ? item.path.endsWith('/')
            ? item.path
            : `${item.path}/`
          : item.path.replace(/\/$/, '');

      try {
        if (item.nodeType === 'FOLDER') {
          await deleteFolderContents(sdk, token, item.bucket, relPath);
        }
        const { response } = await sdk.deleteFile(item.bucket, relPath, withAuthHeader(token));
        return { path: item.path, success: response.ok };
      } catch (err) {
        errorLog(`dial-files/delete: failed for ${item.bucket}/${item.path}: ${String(err)}`);
        return { path: item.path, success: false };
      }
    }),
  );

  return NextResponse.json({ results }, { headers: JSON_CONTENT_TYPE_HEADERS });
}
