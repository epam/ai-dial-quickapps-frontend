import { DialItemType } from '@epam/ai-dial-ui-kit';

import { PUBLIC_BUCKET_SEGMENT } from '@/constants/dial-paths';
import { safeDecodeURI } from '@/utils/safe-decode-uri';

const FILES_ROOT = 'files';

export interface KnowledgeBaseRootLabels {
  personal: string;
  organization: string;
  shared: string;
}

export interface KnowledgeBaseItemPath {
  type: DialItemType;
  name: string;
  /** Root label, then each folder, then the item name. */
  segments: string[];
}

const getRootLabel = (
  bucket: string,
  ownBucket: string | undefined,
  rootLabels: KnowledgeBaseRootLabels,
): string => {
  if (bucket === PUBLIC_BUCKET_SEGMENT) return rootLabels.organization;
  if (ownBucket && bucket === ownBucket) return rootLabels.personal;
  return rootLabels.shared;
};

/**
 * Splits a stored DIAL file resource id (`files/<bucket>/<folders…>/<name>`, folders end in `/`)
 * into the item type, its name and the breadcrumb segments. An id that is not a `files/` resource
 * falls back to a single segment holding the decoded id.
 */
export const parseKnowledgeBaseItem = (
  id: string,
  ownBucket: string | undefined,
  rootLabels: KnowledgeBaseRootLabels,
): KnowledgeBaseItemPath => {
  const decoded = safeDecodeURI(id);
  const type = decoded.endsWith('/') ? DialItemType.Folder : DialItemType.File;
  const parts = decoded.split('/').filter(Boolean);

  if (parts.length < 2 || parts[0] !== FILES_ROOT) {
    const name = parts[parts.length - 1] ?? decoded;
    return { type, name, segments: [decoded || name] };
  }

  const [, bucket, ...rest] = parts;
  const rootLabel = getRootLabel(bucket, ownBucket, rootLabels);
  if (rest.length === 0) {
    return { type: DialItemType.Folder, name: rootLabel, segments: [rootLabel] };
  }

  return { type, name: rest[rest.length - 1], segments: [rootLabel, ...rest] };
};
