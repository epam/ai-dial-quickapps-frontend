import { type EntityScopeInfo, ResourceScope } from '@/types/resource-scope';

/**
 * Entity roots whose second id segment is always a bucket
 * (same convention as `isPublicToolsetId` in `@/utils/api`).
 */
const BUCKETED_ROOTS = new Set(['toolsets', 'applications']);

/** Entity roots whose second segment is a publisher path, not a bucket (`model/openai/gpt-4o`). */
const MODEL_ROOTS = new Set(['model', 'models']);

const PUBLIC_BUCKET_SEGMENT = 'public';

/** Minimum id segments (root + bucket + name) for an entity to be scope-classifiable. */
const MIN_CLASSIFIABLE_SEGMENTS = 3;

const decodeSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    // Malformed encoding — keep the raw segment rather than throwing.
    return segment;
  }
};

const classifyBucket = (
  bucket: string,
  userBucket?: string,
): ResourceScope | undefined => {
  if (bucket === PUBLIC_BUCKET_SEGMENT) return ResourceScope.Organization;
  // Without the user's bucket id a non-public bucket is indeterminate —
  // return undefined so the UI hides the scope line instead of guessing.
  if (userBucket == null) return undefined;
  return bucket === userBucket ? ResourceScope.Personal : ResourceScope.Shared;
};

/**
 * Derives the Personal / Shared / Organization scope and the normalized folder
 * path of a DIAL entity from its id, e.g.
 * `toolsets/public/folder1/my-toolset__1.0` → Organization / `['folder1']`.
 *
 * Ids that cannot be classified (free-form custom tool ids, `prompts/...`,
 * or a non-public bucket while the user's bucket is unknown) return
 * `undefined` so callers can hide the scope line.
 *
 * Note on `model/` ids: the second segment is only treated as a bucket when it
 * is `public` or the user's own bucket — anything else is a publisher path
 * (`model/openai/gpt-4o`) and classified as Organization.
 */
export const getEntityScopeInfo = (id: string, userBucket?: string): EntityScopeInfo | undefined => {
  const parts = id.split('/').map(decodeSegment);
  if (parts.length < MIN_CLASSIFIABLE_SEGMENTS) return undefined;

  const [root, secondSegment] = parts;
  const folderPath = parts.slice(2, -1);

  if (BUCKETED_ROOTS.has(root)) {
    const scope = classifyBucket(secondSegment, userBucket);
    if (scope == null) return undefined;
    return { scope, folderPath };
  }

  if (MODEL_ROOTS.has(root)) {
    // A model id's second segment is only a bucket for `public` or the user's
    // own bucket; otherwise it starts a publisher path.
    const isBucketSegment = secondSegment === PUBLIC_BUCKET_SEGMENT || secondSegment === userBucket;
    if (isBucketSegment) {
      const scope = classifyBucket(secondSegment, userBucket);
      if (scope == null) return undefined;
      return { scope, folderPath };
    }
    return { scope: ResourceScope.Organization, folderPath };
  }

  return undefined;
};
