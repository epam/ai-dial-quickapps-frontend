import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import {
  encodeDialPath,
  getDialAuth,
  JSON_CONTENT_TYPE_HEADERS,
} from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

interface RenameItemDto {
  bucket: string;
  sourcePath: string;
  destinationPath: string;
}

/**
 * POST /api/dial-files/rename
 *
 * Body: { items: Array<{ bucket, sourcePath, destinationPath }> }
 *
 * Calls DIAL Core POST /v1/ops/resource/move per item (there is no batch
 * move endpoint).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-files/rename: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { items } = (await req.json()) as { items?: RenameItemDto[] };
  if (!items?.length) {
    warnLog('dial-files/rename: missing items');
    return NextResponse.json({ error: 'Missing items' }, { status: 400 });
  }

  const sdk = getDialSDK(dialApiHost);

  const results = await Promise.all(
    items.map(async (item) => {
      // sourceUrl/destinationUrl are DIAL resource URLs — DIAL Core expects
      // each path segment percent-encoded (the same shape it returns in
      // metadata `url` fields), not the raw human-readable path.
      const sourceUrl = `files/${item.bucket}/${encodeDialPath(item.sourcePath)}`;
      const destinationUrl = `files/${item.bucket}/${encodeDialPath(item.destinationPath)}`;
      try {
        const { error, response } = await sdk.moveResource({
          ...withAuthHeader(token),
          body: { sourceUrl, destinationUrl, overwrite: false },
        });
        if (!response.ok) {
          errorLog(
            `dial-files/rename: upstream ${response.status} for ${sourceUrl} -> ${destinationUrl}: ${JSON.stringify(error)}`,
          );
        }
        return { sourcePath: item.sourcePath, success: response.ok, error };
      } catch (err) {
        errorLog(`dial-files/rename: failed for ${sourceUrl}: ${String(err)}`);
        return { sourcePath: item.sourcePath, success: false, error: String(err) };
      }
    }),
  );

  return NextResponse.json({ results }, { headers: JSON_CONTENT_TYPE_HEADERS });
}
