import type { DialFile } from '@epam/ai-dial-ui-kit';
import { DialFileNodeType } from '@epam/ai-dial-ui-kit';
import { safeDecodeURI } from '@/utils/safe-decode-uri';

const HIDDEN_FILE = '.dial_folder';

export const isHiddenPath = (path: string): boolean => path.includes(HIDDEN_FILE);

export const resolveRelativeDialFilePath = (pathOrFileId: string, bucket: string): string => {
  const resourcePrefix = `files/${bucket}/`;
  if (pathOrFileId.startsWith(resourcePrefix)) {
    return safeDecodeURI(pathOrFileId.slice(resourcePrefix.length));
  }

  if (pathOrFileId.startsWith('files/')) {
    const withoutPrefix = pathOrFileId.slice('files/'.length);
    const slashIdx = withoutPrefix.indexOf('/');
    if (slashIdx >= 0) {
      const pathBucket = withoutPrefix.slice(0, slashIdx);
      const rawPath = withoutPrefix.slice(slashIdx + 1);
      if (pathBucket === bucket) {
        return safeDecodeURI(rawPath);
      }
    }
  }

  return pathOrFileId;
};

export const virtualPathToApiPath = (virtualPath: string, rootLabel: string): string => {
  const rootExact = `/${rootLabel}`;
  const rootWithSlash = `/${rootLabel}/`;
  const labelWithSlash = `${rootLabel}/`;

  if (
    virtualPath === rootExact ||
    virtualPath === rootLabel ||
    virtualPath === rootWithSlash ||
    virtualPath === labelWithSlash
  ) {
    return '';
  }

  let stripped: string;
  if (virtualPath.startsWith(rootWithSlash)) {
    stripped = virtualPath.slice(rootWithSlash.length);
  } else if (virtualPath.startsWith(labelWithSlash)) {
    stripped = virtualPath.slice(labelWithSlash.length);
  } else {
    const withoutLeadingSlash = virtualPath.replace(/^\//, '');
    stripped = withoutLeadingSlash.startsWith(labelWithSlash)
      ? withoutLeadingSlash.slice(labelWithSlash.length)
      : withoutLeadingSlash;
  }

  return stripped && !stripped.endsWith('/') ? `${stripped}/` : stripped;
};

const looksLikeVirtualDialPath = (path: string, rootLabel: string): boolean =>
  path.startsWith('/') || path === rootLabel || path.startsWith(`${rootLabel}/`);

export const resolveDialFileApiPath = (
  file: DialFile,
  bucket: string,
  rootLabel: string,
): string => {
  const isFolder = file.nodeType === DialFileNodeType.FOLDER;
  const fromResourceId = file.id ? resolveRelativeDialFilePath(file.id, bucket) : null;
  const isResourceIdValid =
    fromResourceId != null && !looksLikeVirtualDialPath(fromResourceId, rootLabel);

  const apiPath = isResourceIdValid ? fromResourceId : virtualPathToApiPath(file.path, rootLabel);

  if (isFolder) {
    return apiPath.endsWith('/') ? apiPath : `${apiPath}/`;
  }

  return apiPath.replace(/\/$/, '');
};
