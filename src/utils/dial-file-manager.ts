import type { DialFile } from '@epam/ai-dial-react-file-manager';
import {
  DialFileManagerTabs,
  DialFileNodeType,
  DialFilePermission,
} from '@epam/ai-dial-react-file-manager';

import { TransferQueueItemStatus, type TransferQueueItem } from '@epam/ai-dial-ui-kit';

import {
  FileUploadStatus,
  type FileUploadBatchState,
  type FileUploadEntry,
  type SharedRootMeta,
} from '@/types/file-manager';
import { FilesApiNodeType, type ListFilesItem } from '@/types/dial-files';
import { listFiles, listPublicFiles, listSharedFiles } from '@/utils/dial-files-api';
import { safeDecodeURI } from '@/utils/safe-decode-uri';

/** One folder's entries, plus the permissions DIAL reports for the folder itself. */
interface FolderListing {
  items: ListFilesItem[];
  permissions?: string[];
}

interface OwnerCoords {
  bucket: string;
  path: string;
}

const CORE_PERMISSION_MAP: Record<string, DialFilePermission> = {
  READ: DialFilePermission.READ,
  WRITE: DialFilePermission.WRITE,
  SHARE: DialFilePermission.SHARE,
};

export const mapCorePermissions = (permissions?: string[]): DialFile['permissions'] | undefined => {
  if (!permissions?.length) return undefined;
  const mapped = permissions
    .map((p) => CORE_PERMISSION_MAP[p.toUpperCase()])
    .filter((p): p is DialFilePermission => p != null);
  return mapped.length > 0 ? mapped : undefined;
};

export const ensureTrailingSlash = (value: string): string =>
  value.endsWith('/') ? value : `${value}/`;

/** The parent folder's cache key of an API path (`''` for top-level entries). */
export const getParentApiPath = (apiPath: string): string => {
  const normalized = apiPath.replace(/\/$/, '');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash > 0 ? normalized.slice(0, lastSlash + 1) : '';
};

export const normalizeVirtualPath = (value: string): string => {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed || '/';
};

export const findFolderByVirtualPath = (
  nodes: DialFile[],
  virtualPath: string,
): DialFile | undefined => {
  const target = normalizeVirtualPath(virtualPath);
  for (const node of nodes) {
    if (node.nodeType !== DialFileNodeType.FOLDER) continue;
    if (normalizeVirtualPath(node.path) === target) return node;
    const nested = findFolderByVirtualPath(node.items ?? [], virtualPath);
    if (nested) return nested;
  }
  return undefined;
};

export const hasDialFileWritePermission = (folder?: DialFile): boolean =>
  folder?.permissions?.includes(DialFilePermission.WRITE) ?? false;

/** Splits the file manager's new-folder virtual path into the parent folder and the new name. */
export const parseNewFolderVirtualPath = (
  newFolderVirtualPath: string,
  rootLabel: string,
): { parentVirtualPath: string; name: string } => {
  const trimmed = newFolderVirtualPath.replace(/\/$/, '');
  const slashIndex = trimmed.lastIndexOf('/');

  if (slashIndex <= 0) {
    const name = slashIndex === 0 ? trimmed.slice(1) : trimmed;
    return { parentVirtualPath: `/${rootLabel}`, name };
  }

  return {
    parentVirtualPath: trimmed.slice(0, slashIndex),
    name: trimmed.slice(slashIndex + 1),
  };
};

/**
 * Builds the file manager's nested tree for `apiPath` from the flat per-folder listings loaded
 * so far. Folders that were never opened come out with no children.
 */
export const buildFromCache = (
  cache: Map<string, ListFilesItem[]>,
  listingPermissionsCache: Map<string, string[] | undefined>,
  apiPath: string,
  virtualBasePath: string,
  folderId: string,
): DialFile[] => {
  const flat = cache.get(apiPath);
  if (flat == null) return [];

  return flat.map((item): DialFile => {
    const isFolder = item.nodeType === FilesApiNodeType.Folder;
    const name = safeDecodeURI(item.name);
    const virtualPath = isFolder ? `${virtualBasePath}/${name}/` : `${virtualBasePath}/${name}`;

    const base: DialFile = {
      id: item.path,
      name,
      path: virtualPath,
      url: item.url,
      parentPath: virtualBasePath,
      nodeType: isFolder ? DialFileNodeType.FOLDER : DialFileNodeType.ITEM,
      folderId,
      bucket: item.bucket,
      author: item.author,
      resourceType: item.resourceType as DialFile['resourceType'],
      contentLength: item.contentLength,
      contentType: item.contentType,
      updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : undefined,
    };

    if (isFolder) {
      const folderApiPath = `${apiPath}${name}/`;
      base.permissions =
        mapCorePermissions(item.permissions) ??
        mapCorePermissions(listingPermissionsCache.get(folderApiPath));
      base.items = buildFromCache(
        cache,
        listingPermissionsCache,
        folderApiPath,
        `${virtualBasePath}/${name}`,
        item.path,
      );
    }

    return base;
  });
};

/** Adds a just-created folder to its parent's cached listing, unless a same-named entry is there. */
export const mergeCreatedFolderIntoCache = (
  cache: Map<string, ListFilesItem[]>,
  parentApiPath: string,
  created: { name: string; path: string; folderId: string; bucket?: string; parentPath?: string },
  inheritedPermissions?: string[],
): Map<string, ListFilesItem[]> => {
  const next = new Map(cache);
  const parentItems = [...(next.get(parentApiPath) ?? [])];
  const folderItem: ListFilesItem = {
    name: created.name,
    path: created.path,
    folderId: created.folderId,
    nodeType: FilesApiNodeType.Folder,
    bucket: created.bucket,
    parentPath: created.parentPath ?? undefined,
    url: created.path,
    permissions: inheritedPermissions,
  };

  if (!parentItems.some((item) => item.name.toLowerCase() === created.name.toLowerCase())) {
    parentItems.push(folderItem);
  }

  next.set(parentApiPath, parentItems);
  return next;
};

/** Returns the upload batch with entry `index` patched (a bare status is shorthand for `{ status }`). */
export const updateUploadEntry = (
  prev: FileUploadBatchState | null,
  index: number,
  patch: FileUploadStatus | Partial<Pick<FileUploadEntry, 'status' | 'percent'>>,
): FileUploadBatchState | null => {
  if (!prev) return prev;
  const changes = typeof patch === 'string' ? { status: patch } : patch;
  const files = prev.files.map((f, i) => (i === index ? { ...f, ...changes } : f));
  return { ...prev, files };
};

const TRANSFER_QUEUE_STATUS: Record<FileUploadStatus, TransferQueueItemStatus> = {
  [FileUploadStatus.Queued]: TransferQueueItemStatus.InProgress,
  [FileUploadStatus.Uploading]: TransferQueueItemStatus.InProgress,
  [FileUploadStatus.Completed]: TransferQueueItemStatus.Success,
  [FileUploadStatus.Failed]: TransferQueueItemStatus.Failed,
  [FileUploadStatus.Cancelled]: TransferQueueItemStatus.Canceled,
};

/** Maps an upload batch to kit `TransferQueue` rows; a percentage is shown only while uploading. */
export const toTransferQueueItems = (batch: FileUploadBatchState): TransferQueueItem[] =>
  batch.files.map(({ id, name, status, percent }) => ({
    id,
    name,
    status: TRANSFER_QUEUE_STATUS[status],
    percent: status === FileUploadStatus.Uploading ? percent : undefined,
  }));

/** True while some file of the batch is still queued or uploading. */
export const isUploadInProgress = (batch: FileUploadBatchState | null): boolean =>
  batch?.files.some(
    ({ status }) => status === FileUploadStatus.Queued || status === FileUploadStatus.Uploading,
  ) ?? false;

const dialCorePathToRelative = (dialCorePath: string, bucket: string): string => {
  const prefix = `files/${bucket}/`;
  return dialCorePath.startsWith(prefix) ? dialCorePath.slice(prefix.length) : dialCorePath;
};

/**
 * In the Shared tab, the first segment of an API path is a shared root's name, not a real
 * folder. Maps such a path to the owner's bucket and the real path inside it. Paths under an
 * unknown root (or the tab's top level) fall back to `fallbackBucket` unchanged.
 */
export const resolveOwnerCoords = (
  apiPath: string,
  sharedRootMeta: Map<string, SharedRootMeta>,
  fallbackBucket: string,
): OwnerCoords => {
  if (!apiPath) return { bucket: fallbackBucket, path: apiPath };
  const firstSlash = apiPath.indexOf('/');
  const sharedRootName = firstSlash === -1 ? apiPath : apiPath.slice(0, firstSlash);
  const meta = sharedRootMeta.get(sharedRootName);
  if (!meta) return { bucket: fallbackBucket, path: apiPath };
  const rootPathInBucket = dialCorePathToRelative(meta.dialCorePath, meta.bucket);
  const subPath = firstSlash === -1 ? '' : apiPath.slice(firstSlash + 1);
  return { bucket: meta.bucket, path: rootPathInBucket + subPath };
};

/** Lists one folder of the given tab. */
export const fetchFolderListing = async (
  tab: DialFileManagerTabs,
  bucket: string,
  folderPath: string,
  sharedRootMeta: Map<string, SharedRootMeta>,
): Promise<FolderListing> => {
  if (tab === DialFileManagerTabs.Shared) {
    if (folderPath === '') {
      const { items } = await listSharedFiles();
      return { items };
    }
    const firstSlash = folderPath.indexOf('/');
    const sharedRootName = firstSlash === -1 ? folderPath : folderPath.slice(0, firstSlash);
    if (!sharedRootMeta.has(sharedRootName)) return { items: [] };

    const owner = resolveOwnerCoords(folderPath, sharedRootMeta, bucket);
    const { items, permissions } = await listFiles({ ...owner, permissions: true });
    return { items, permissions };
  }

  if (tab === DialFileManagerTabs.Organization) {
    const { items } = await listPublicFiles({ path: folderPath || undefined });
    return { items };
  }

  const { items, permissions } = await listFiles({ bucket, path: folderPath, permissions: true });
  return { items, permissions };
};

/** The name the browser saves a download as: the file itself, or a zip archive. */
export const getDownloadFileName = (dialFiles: DialFile[]): string => {
  if (dialFiles.length !== 1) return 'files.zip';
  const [file] = dialFiles;
  return file.nodeType === DialFileNodeType.ITEM ? file.name : `${file.name}.zip`;
};

/** The storage sections a file can live in; the combined All view shows all three at once. */
export type DialFileSourceTab =
  | DialFileManagerTabs.MyFiles
  | DialFileManagerTabs.Shared
  | DialFileManagerTabs.Organization;

export type DialFileSourceLabels = Record<DialFileSourceTab, string>;

/**
 * Finds which section a virtual path belongs to by its leading root label, e.g. `/Shared/docs/a.md`
 * belongs to the section labelled `Shared`. Returns undefined when no label prefixes the path.
 */
export const resolveSourceByPath = (
  virtualPath: string,
  labels: DialFileSourceLabels,
): DialFileSourceTab | undefined => {
  const firstSegment = virtualPath.replace(/^\/+/, '').split('/')[0];
  return (Object.keys(labels) as DialFileSourceTab[]).find((tab) => labels[tab] === firstSegment);
};

/** Groups items by the section their virtual path belongs to; items under no known section are dropped. */
export const groupBySource = <T>(
  items: T[],
  getPath: (item: T) => string,
  labels: DialFileSourceLabels,
): Map<DialFileSourceTab, T[]> => {
  const groups = new Map<DialFileSourceTab, T[]>();
  for (const item of items) {
    const source = resolveSourceByPath(getPath(item), labels);
    if (source == null) continue;
    groups.set(source, [...(groups.get(source) ?? []), item]);
  }
  return groups;
};
