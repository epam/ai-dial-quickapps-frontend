import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import { getDialAuth, JSON_CONTENT_TYPE_HEADERS } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

/**
 * GET /api/dial-skills/catalog
 *
 * Query params:
 *   bucket – the caller's personal bucket id (required)
 *
 * Replicates `ai-dial-chat`'s `SkillsListingService.listCatalogSkills`
 * directly against DIAL Core, since this app has no BFF of its own:
 *   1. Recursively page `listSkillMetadata` for the personal bucket and the
 *      `public` bucket, keeping only `nodeType === 'ITEM'` entries.
 *   2. Fetch skills shared with the user via `getSharedResources`.
 *   3. Stamp `isMy`/`canEdit`/`sharedWithMe` and dedupe shared items already
 *      present in the personal/public sets by `url`.
 */

const PUBLIC_BUCKET = 'public';
const CATALOG_PAGE_SIZE = 1000;

interface RawMetadataItem {
  name?: string;
  bucket?: string;
  parentPath?: string;
  nodeType?: string;
  url?: string;
  permissions?: string[];
  etag?: string;
  author?: string;
  createdAt?: number;
  updatedAt?: number;
  attributes?: Record<string, unknown>;
  items?: RawMetadataItem[];
  nextToken?: string;
}

interface SkillMetadataItem {
  name: string;
  path: string;
  url: string;
  bucket: string;
  nodeType: 'item' | 'folder';
  parentPath?: string;
  permissions?: string[];
  etag?: string;
  author?: string;
  createdAt?: number;
  updatedAt?: number;
  description?: string;
  isMy?: boolean;
  canEdit?: boolean;
  sharedWithMe?: boolean;
}

const joinMetadataPath = (parentPath: string | undefined, name: string): string => {
  if (!parentPath) return name;
  return `${parentPath.replace(/\/+$/, '')}/${name}`;
};

/**
 * Normalizes DIAL Core's `MetadataBase` (`nodeType: 'FOLDER' | 'ITEM'`) into a
 * `SkillMetadataItem`. `description` comes from `item.attributes.description`
 * — a field the SDK's typed schema doesn't declare, so it's read loosely off
 * the raw JSON, same as `mapToSkillMetadataItem` does in ai-dial-chat.
 */
const mapToSkillMetadataItem = (item: RawMetadataItem): SkillMetadataItem | null => {
  const nodeType = item.nodeType === 'FOLDER' ? 'folder' : item.nodeType === 'ITEM' ? 'item' : null;
  if (nodeType == null || item.bucket == null || item.name == null) return null;

  const path = joinMetadataPath(item.parentPath, item.name);
  const url = nodeType === 'item' ? `skills/${item.bucket}/${path}` : item.url ?? `skills/${item.bucket}/${path}`;
  const description =
    nodeType === 'item' && typeof item.attributes?.description === 'string'
      ? item.attributes.description
      : undefined;

  return {
    name: item.name,
    path: nodeType === 'folder' ? `${path}/` : path,
    url,
    bucket: item.bucket,
    nodeType,
    parentPath: item.parentPath,
    permissions: item.permissions,
    etag: item.etag,
    author: item.author,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    description,
  };
};

const listAllSkillItems = async (
  bucket: string,
  sdk: ReturnType<typeof getDialSDK>,
  token: string,
): Promise<SkillMetadataItem[]> => {
  const items: SkillMetadataItem[] = [];
  const visitedTokens = new Set<string>();
  let pageToken: string | undefined;

  do {
    const { data, error, response } = await sdk.listSkillMetadata(bucket, '', {
      ...withAuthHeader(token),
      params: { query: { token: pageToken, limit: CATALOG_PAGE_SIZE, recursive: true } },
    });
    if (!response.ok || data == null) {
      throw new Error(`listSkillMetadata failed for bucket=${bucket}: ${JSON.stringify(error)}`);
    }

    const page = data as RawMetadataItem;
    items.push(
      ...(page.items ?? [])
        .map(mapToSkillMetadataItem)
        .filter((item): item is SkillMetadataItem => item != null && item.nodeType === 'item'),
    );

    pageToken = page.nextToken;
    if (pageToken != null) {
      if (visitedTokens.has(pageToken)) {
        throw new Error('DIAL Core returned a repeated skill page token');
      }
      visitedTokens.add(pageToken);
    }
  } while (pageToken != null);

  return items;
};

const listSharedSkills = async (
  sdk: ReturnType<typeof getDialSDK>,
  token: string,
): Promise<SkillMetadataItem[]> => {
  try {
    const { data, error } = await sdk.getSharedResources({
      ...withAuthHeader(token),
      body: { resourceTypes: ['SKILL'], with: 'me' },
    });
    if (error != null || data == null) {
      warnLog(`dial-skills/catalog: getSharedResources(SKILL) returned an error ${JSON.stringify(error)}`);
      return [];
    }

    const resources = (data as { resources?: RawMetadataItem[] }).resources ?? [];
    return resources
      .filter((item) => item.nodeType === 'ITEM')
      .map((item) => {
        if (item.url == null) return mapToSkillMetadataItem(item);

        const url = decodeURIComponent(item.url).replace(/\/+$/, '');
        const [prefix, bucket, ...pathSegments] = url.split('/');
        if (prefix !== 'skills' || !bucket || pathSegments.length === 0) return null;

        const path = pathSegments.join('/');
        const name = pathSegments[pathSegments.length - 1];
        const parentPath = pathSegments.length > 1 ? `${pathSegments.slice(0, -1).join('/')}/` : undefined;

        return mapToSkillMetadataItem({ ...item, bucket, name, parentPath, url: `skills/${bucket}/${path}` });
      })
      .filter((item): item is SkillMetadataItem => item != null)
      .map((item) => ({
        ...item,
        isMy: false,
        canEdit: item.permissions?.includes('WRITE') ?? false,
        sharedWithMe: true,
      }));
  } catch (err) {
    warnLog(`dial-skills/catalog: getSharedResources(SKILL) failed: ${err}`);
    return [];
  }
};

interface SkillCatalog {
  skills: SkillMetadataItem[];
  publicSkills: SkillMetadataItem[];
  sharedWithMe: SkillMetadataItem[];
}

const listCatalogSkills = async (
  bucket: string,
  sdk: ReturnType<typeof getDialSDK>,
  token: string,
): Promise<SkillCatalog> => {
  const [[personalResult, publicResult], shared] = await Promise.all([
    Promise.allSettled([
      listAllSkillItems(bucket, sdk, token),
      listAllSkillItems(PUBLIC_BUCKET, sdk, token),
    ]),
    listSharedSkills(sdk, token),
  ]);

  if (personalResult.status === 'rejected' && publicResult.status === 'rejected') {
    throw personalResult.reason;
  }
  if (personalResult.status === 'rejected') {
    warnLog('dial-skills/catalog: personal skill listing failed');
  }
  if (publicResult.status === 'rejected') {
    warnLog('dial-skills/catalog: public skill listing failed');
  }

  const personal = personalResult.status === 'fulfilled' ? personalResult.value : [];
  const organisation = publicResult.status === 'fulfilled' ? publicResult.value : [];

  const skills = personal.map((item) => ({ ...item, isMy: true, canEdit: true, sharedWithMe: false }));
  const publicSkills = organisation.map((item) => ({
    ...item,
    isMy: false,
    canEdit: false,
    sharedWithMe: false,
  }));
  const listedUrls = new Set([...skills, ...publicSkills].map((item) => item.url));

  return {
    skills,
    publicSkills,
    sharedWithMe: shared.filter((item) => !listedUrls.has(item.url)),
  };
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-skills/catalog: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const bucket = req.nextUrl.searchParams.get('bucket');
  if (!bucket) {
    warnLog('dial-skills/catalog: missing bucket parameter');
    return NextResponse.json({ error: 'Missing bucket' }, { status: 400 });
  }

  const sdk = getDialSDK(dialApiHost);
  try {
    const catalog = await listCatalogSkills(bucket, sdk, token);
    return NextResponse.json(catalog, { headers: JSON_CONTENT_TYPE_HEADERS });
  } catch (err) {
    errorLog(`dial-skills/catalog: failed to list skills for bucket=${bucket}: ${err}`);
    return NextResponse.json({ error: 'Failed to list skills.' }, { status: 502 });
  }
}
