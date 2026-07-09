'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';

import type { DialCopiedItem, DialDeletedItem, DialFile, DialUploadFileItem } from '@epam/ai-dial-ui-kit';
import {
  DialFileManagerActions,
  DialFileManagerTabs,
  DialFileNodeType,
  DialFilePermission,
  FileManagerColumnKey,
  NotificationVariant,
} from '@epam/ai-dial-ui-kit';

import { DialFileManagerI18nKeys } from '@/constants/i18n';
import type { FileUploadBatchState, FileUploadEntry } from '@/types/file-manager';
import { FileUploadStatus } from '@/types/file-manager';
import type { ListFilesItem } from '@/utils/dial-files-api';
import {
  createFolder,
  deleteFiles,
  downloadArchive,
  downloadFile,
  listFiles,
  listPublicFiles,
  listSharedFiles,
  renameFiles,
  uploadFile,
} from '@/utils/dial-files-api';
import { resolveDialFileApiPath, virtualPathToApiPath } from '@/utils/dial-file-path';
import {
  DownloadDestinationType,
  prepareDownloadDestination,
  triggerBrowserDownload,
} from '@/utils/file-download';
import { sanitizeFileName } from '@/utils/file-name';
import { safeDecodeURI } from '@/utils/safe-decode-uri';
import { Translation } from '@/types/translation';

export interface UseDialFileManagerOptions {
  bucket: string;
  rootLabel?: string;
  activeTab?: DialFileManagerTabs;
  onNotification?: (notification: FileManagerNotification) => void;
  forbiddenSymbolsRegExp?: RegExp;
}

export interface UseDialFileManagerResult {
  items: DialFile[];
  isLoading: boolean;
  error: string | null;
  path: string;
  onPathChange: (nextPath?: string) => void;
  retry: () => void;
  onUploadFiles: (files: DialUploadFileItem[], destinationFolder: string) => void;
  onValidateUpload: (
    files: DialUploadFileItem[],
    existingFiles: DialFile[],
    destinationFolder: string,
  ) => Promise<FileUploadValidationResult>;
  uploadBatchState: FileUploadBatchState | null;
  cancelUpload: () => void;
  clearUploadBatch: () => void;
  onCreateFolder: (file: DialUploadFileItem, folderPath: string, fileId: string) => Promise<void>;
  onCreateFolderValidate: (name: string, parentFolder: DialFile) => string | null;
  isCreatingFolder: boolean;
  onDownloadFiles: (dialFiles: DialFile[]) => void;
  isDownloading: boolean;
  onDeleteFiles: (items: DialDeletedItem[], sourceFolder: string) => void;
  isDeleting: boolean;
  onRenameValidate: (value: string, item: DialFile) => string | null;
  onMoveToFiles: (
    items: DialCopiedItem[],
    sourceFolder: string,
    destinationFolder: string,
  ) => void;
  isRenaming: boolean;
  uploadEnabled: boolean;
  isNewButtonDisabled: boolean;
  disabledNewButtonTooltip: string;
  visibleColumns: FileManagerColumnKey[];
  dateLocale: string;
  dateOptions: Intl.DateTimeFormatOptions;
  actionLabels: Partial<Record<DialFileManagerActions, string>>;
  sharedWithMeIds: string[] | undefined;
}

interface FileUploadValidationResult {
  valid: boolean;
  message?: string;
}

interface FileManagerNotification {
  variant: NotificationVariant;
  title?: string;
  message: string;
}

const UPLOAD_CONCURRENCY = 3;
const HIDDEN_FILE = '.dial_folder';

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
};

const COLUMNS_WITHOUT_AUTHOR: FileManagerColumnKey[] = [
  FileManagerColumnKey.Name,
  FileManagerColumnKey.UpdatedAt,
  FileManagerColumnKey.Size,
  FileManagerColumnKey.Actions,
];

const COLUMNS_WITH_AUTHOR: FileManagerColumnKey[] = [
  FileManagerColumnKey.Name,
  FileManagerColumnKey.UpdatedAt,
  FileManagerColumnKey.Size,
  FileManagerColumnKey.Author,
  FileManagerColumnKey.Actions,
];

const CORE_PERMISSION_MAP: Record<string, DialFilePermission> = {
  READ: DialFilePermission.READ,
  WRITE: DialFilePermission.WRITE,
  SHARE: DialFilePermission.SHARE,
};

const mapCorePermissions = (
  permissions?: string[],
): DialFile['permissions'] | undefined => {
  if (!permissions?.length) return undefined;
  const mapped = permissions
    .map((p) => CORE_PERMISSION_MAP[p.toUpperCase()])
    .filter((p): p is DialFilePermission => p != null);
  return mapped.length > 0 ? mapped : undefined;
};

const normalizeVirtualPath = (value: string): string => {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed || '/';
};

const findFolderByVirtualPath = (
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

const hasDialFileWritePermission = (folder?: DialFile): boolean =>
  folder?.permissions?.includes(DialFilePermission.WRITE) ?? false;

const parseNewFolderVirtualPath = (
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

const buildFromCache = (
  cache: Map<string, ListFilesItem[]>,
  listingPermissionsCache: Map<string, string[] | undefined>,
  apiPath: string,
  virtualBasePath: string,
  folderId: string,
): DialFile[] => {
  const flat = cache.get(apiPath);
  if (flat == null) return [];

  return flat.map((item): DialFile => {
    const isFolder = item.nodeType === 'FOLDER';
    const name = safeDecodeURI(item.name);
    const virtualPath = isFolder
      ? `${virtualBasePath}/${name}/`
      : `${virtualBasePath}/${name}`;

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
      updatedAt: item.updatedAt
        ? new Date(item.updatedAt).toISOString()
        : undefined,
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

const mergeCreatedFolderIntoCache = (
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
    nodeType: 'FOLDER',
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

const updateEntry = (
  prev: FileUploadBatchState | null,
  index: number,
  patch: FileUploadStatus | Partial<Pick<FileUploadEntry, 'status' | 'percent'>>,
): FileUploadBatchState | null => {
  if (!prev) return prev;
  const changes = typeof patch === 'string' ? { status: patch } : patch;
  const files = prev.files.map((f, i) => (i === index ? { ...f, ...changes } : f));
  return { ...prev, files };
};

interface SharedRootMeta {
  bucket: string;
  dialCorePath: string;
}

const dialCorePathToRelative = (dialCorePath: string, bucket: string): string => {
  const prefix = `files/${bucket}/`;
  return dialCorePath.startsWith(prefix)
    ? dialCorePath.slice(prefix.length)
    : dialCorePath;
};

const resolveOwnerCoords = (
  apiPath: string,
  sharedRootMeta: Map<string, SharedRootMeta>,
  fallbackBucket: string,
): { bucket: string; path: string } => {
  if (!apiPath) return { bucket: fallbackBucket, path: apiPath };
  const firstSlash = apiPath.indexOf('/');
  const sharedRootName = firstSlash === -1 ? apiPath : apiPath.slice(0, firstSlash);
  const meta = sharedRootMeta.get(sharedRootName);
  if (!meta) return { bucket: fallbackBucket, path: apiPath };
  const rootPathInBucket = dialCorePathToRelative(meta.dialCorePath, meta.bucket);
  const subPath = firstSlash === -1 ? '' : apiPath.slice(firstSlash + 1);
  return { bucket: meta.bucket, path: rootPathInBucket + subPath };
};

const fetchByTab = (
  tab: DialFileManagerTabs,
  bucket: string,
  folderPath: string,
  sharedRootMeta: Map<string, SharedRootMeta>,
): Promise<{ items: ListFilesItem[]; permissions?: string[] }> => {
  if (tab === DialFileManagerTabs.Shared) {
    if (folderPath === '') {
      return listSharedFiles().then((res) => ({ items: res.items }));
    }
    const firstSlash = folderPath.indexOf('/');
    const sharedRootName = firstSlash === -1 ? folderPath : folderPath.slice(0, firstSlash);
    const meta = sharedRootMeta.get(sharedRootName);
    if (meta) {
      const rootPathInBucket = dialCorePathToRelative(meta.dialCorePath, meta.bucket);
      const subPath = firstSlash === -1 ? '' : folderPath.slice(firstSlash + 1);
      const actualPath = rootPathInBucket + subPath;
      return listFiles({
        bucket: meta.bucket,
        path: actualPath,
        permissions: true,
      }).then((res) => ({ items: res.items, permissions: res.permissions }));
    }
    return Promise.resolve({ items: [] });
  }
  if (tab === DialFileManagerTabs.Organization) {
    return listPublicFiles({ path: folderPath || undefined }).then((res) => ({
      items: res.items,
    }));
  }
  return listFiles({ bucket, path: folderPath, permissions: true }).then((res) => ({
    items: res.items,
    permissions: res.permissions,
  }));
};

export const useDialFileManager = ({
  bucket,
  rootLabel = 'My files',
  activeTab = DialFileManagerTabs.MyFiles,
  onNotification,
  forbiddenSymbolsRegExp,
}: UseDialFileManagerOptions): UseDialFileManagerResult => {
  const { t, i18n } = useI18nTranslation(Translation.Common);
  const [folderPath, setFolderPath] = useState('');
  const [cache, setCache] = useState<Map<string, ListFilesItem[]>>(() => new Map());
  const [listingPermissionsCache, setListingPermissionsCache] = useState<
    Map<string, string[] | undefined>
  >(() => new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);
  const [sharedRootIds, setSharedRootIds] = useState<string[] | undefined>(undefined);

  const sharedRootMetaRef = useRef<Map<string, SharedRootMeta>>(new Map());

  const [uploadBatchState, setUploadBatchState] = useState<FileUploadBatchState | null>(null);
  const uploadAbortControllerRef = useRef<AbortController | null>(null);

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current === activeTab) return;
    prevTabRef.current = activeTab;
    setCache(new Map());
    setListingPermissionsCache(new Map());
    setFolderPath('');
    setSharedRootIds(undefined);
    sharedRootMetaRef.current = new Map();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === DialFileManagerTabs.MyFiles && !bucket) return;

    let cancelled = false;
    const run = () => {
      setIsLoading(true);
      setError(null);

      return fetchByTab(activeTab, bucket, folderPath, sharedRootMetaRef.current);
    };

    run()
      .then(({ items: flat, permissions }) => {
        if (cancelled) return;
        setCache((prev) => {
          const next = new Map(prev);
          next.set(folderPath, flat);
          return next;
        });
        setListingPermissionsCache((prev) => new Map(prev).set(folderPath, permissions));
        if (activeTab === DialFileManagerTabs.Shared && folderPath === '') {
          setSharedRootIds(flat.map((item) => item.path));
          sharedRootMetaRef.current = new Map(
            flat.map((item) => [
              safeDecodeURI(item.name),
              { bucket: item.bucket ?? '', dialCorePath: item.path },
            ]),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setError('dialFileManager.error');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, bucket, folderPath, retryCounter]);

  const items = useMemo(
    (): DialFile[] => [
      {
        id: bucket,
        name: rootLabel,
        path: `/${rootLabel}`,
        parentPath: '',
        nodeType: DialFileNodeType.FOLDER,
        folderId: bucket,
        permissions: mapCorePermissions(listingPermissionsCache.get('')),
        items: buildFromCache(cache, listingPermissionsCache, '', `/${rootLabel}`, bucket),
      },
    ],
    [cache, listingPermissionsCache, rootLabel, bucket],
  );

  const onPathChange = useCallback(
    (nextPath?: string) => {
      if (nextPath == null) {
        setFolderPath('');
        return;
      }
      const rootWithSlash = `/${rootLabel}/`;
      const labelWithSlash = `${rootLabel}/`;

      if (
        nextPath === `/${rootLabel}` ||
        nextPath === rootWithSlash ||
        nextPath === rootLabel ||
        nextPath === labelWithSlash
      ) {
        setFolderPath('');
        return;
      }

      let stripped: string;
      if (nextPath.startsWith(rootWithSlash)) {
        stripped = nextPath.slice(rootWithSlash.length);
      } else if (nextPath.startsWith(labelWithSlash)) {
        stripped = nextPath.slice(labelWithSlash.length);
      } else {
        const withoutLeadingSlash = nextPath.replace(/^\//, '');
        stripped = withoutLeadingSlash.startsWith(labelWithSlash)
          ? withoutLeadingSlash.slice(labelWithSlash.length)
          : withoutLeadingSlash;
      }

      setFolderPath(
        stripped && !stripped.endsWith('/') ? `${stripped}/` : stripped,
      );
    },
    [rootLabel],
  );

  const retry = useCallback(() => {
    setRetryCounter((c) => c + 1);
  }, []);

  const onUploadFiles = useCallback(
    (files: DialUploadFileItem[], destinationFolder: string) => {
      if (files.length === 0) return;

      const controller = new AbortController();
      uploadAbortControllerRef.current = controller;

      const entries: FileUploadEntry[] = files.map((f, i) => ({
        id: `${Date.now()}-${i}`,
        name: f.name,
        status: FileUploadStatus.Queued,
      }));

      setUploadBatchState({ files: entries, isOpen: true });

      const destinationApiPath = virtualPathToApiPath(destinationFolder, rootLabel);
      const { bucket: uploadBucket, path: uploadBasePath } =
        activeTab === DialFileManagerTabs.Shared
          ? resolveOwnerCoords(destinationApiPath, sharedRootMetaRef.current, bucket)
          : { bucket, path: destinationApiPath };

      const cachedNames = new Set(
        (cache.get(destinationApiPath) ?? []).map((item) => item.name.toLowerCase()),
      );

      const processBatch = async () => {
        let nextIndex = 0;
        let successCount = 0;
        let failedCount = 0;

        const worker = async () => {
          while (nextIndex < files.length) {
            const i = nextIndex++;
            const file = files[i];

            if (controller.signal.aborted) {
              setUploadBatchState((prev) => updateEntry(prev, i, FileUploadStatus.Cancelled));
              continue;
            }

            setUploadBatchState((prev) =>
              updateEntry(prev, i, { status: FileUploadStatus.Uploading, percent: 0 }),
            );

            const uploadMode = cachedNames.has(file.name.toLowerCase())
              ? 'overwrite'
              : 'create-only';

            try {
              await uploadFile(
                uploadBucket,
                `${uploadBasePath}${file.name}`,
                file.fileContent as File,
                {
                  signal: controller.signal,
                  uploadMode,
                  onProgress: (percent) => {
                    setUploadBatchState((prev) =>
                      updateEntry(prev, i, { status: FileUploadStatus.Uploading, percent }),
                    );
                  },
                },
              );
              setUploadBatchState((prev) =>
                updateEntry(prev, i, { status: FileUploadStatus.Completed, percent: 100 }),
              );
              successCount += 1;
            } catch {
              const status = controller.signal.aborted
                ? FileUploadStatus.Cancelled
                : FileUploadStatus.Failed;
              if (status === FileUploadStatus.Failed) failedCount += 1;
              setUploadBatchState((prev) => updateEntry(prev, i, status));
            }
          }
        };

        await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, () => worker()));

        if (!controller.signal.aborted) {
          if (successCount === 0 && failedCount > 0) {
            onNotification?.({
              variant: NotificationVariant.Error,
              title: t(DialFileManagerI18nKeys.UploadFailed),
              message: t(DialFileManagerI18nKeys.CheckInternetConnection),
            });
          } else {
            onNotification?.({
              variant: NotificationVariant.Success,
              message: t(DialFileManagerI18nKeys.UploadSuccess, {
                parentPath: uploadBasePath || rootLabel,
              }),
            });
          }
        }

        setCache((prev) => {
          const next = new Map(prev);
          next.delete(destinationApiPath);
          return next;
        });
        setRetryCounter((c) => c + 1);
        uploadAbortControllerRef.current = null;
        setUploadBatchState(null);
      };

      void processBatch();
    },
    [activeTab, bucket, cache, rootLabel, onNotification, t],
  );

  const onValidateUpload = useCallback(
    async (files: DialUploadFileItem[]): Promise<FileUploadValidationResult> => {
      for (const file of files) {
        file.name = sanitizeFileName(file.name);
      }
      return { valid: true };
    },
    [],
  );

  const cancelUpload = useCallback(() => {
    uploadAbortControllerRef.current?.abort();
  }, []);

  const onCreateFolder = useCallback(
    async (_file: DialUploadFileItem, folderVirtualPath: string): Promise<void> => {
      setIsCreatingFolder(true);
      const { parentVirtualPath, name } = parseNewFolderVirtualPath(
        folderVirtualPath,
        rootLabel,
      );
      const parentApiPath = virtualPathToApiPath(parentVirtualPath, rootLabel);
      const { bucket: targetBucket, path: targetParentPath } =
        activeTab === DialFileManagerTabs.Shared
          ? resolveOwnerCoords(parentApiPath, sharedRootMetaRef.current, bucket)
          : { bucket, path: parentApiPath };
      try {
        const created = await createFolder({
          bucket: targetBucket,
          parentPath: targetParentPath || undefined,
          name,
        });
        setCache((prev) =>
          mergeCreatedFolderIntoCache(
            prev,
            parentApiPath,
            created,
            listingPermissionsCache.get(parentApiPath),
          ),
        );
        setRetryCounter((c) => c + 1);
      } catch {
        onNotification?.({
          variant: NotificationVariant.Error,
          message: t(DialFileManagerI18nKeys.FolderCreateError),
        });
      } finally {
        setIsCreatingFolder(false);
      }
    },
    [activeTab, bucket, rootLabel, listingPermissionsCache, onNotification, t],
  );

  const onCreateFolderValidate = useCallback(
    (name: string, parentFolder: DialFile): string | null => {
      if (!name || name.trim() === '') {
        return t('dialFileManager.folderNameEmpty');
      }
      if (/[/\\]/.test(name)) {
        return t('dialFileManager.folderNameInvalidChars');
      }
      if (name.startsWith('.')) {
        return t('dialFileManager.folderNameHidden');
      }
      if (name === HIDDEN_FILE) {
        return t('dialFileManager.folderNameReserved');
      }
      if (name.length > 255) {
        return t('dialFileManager.folderNameTooLong');
      }
      const siblings = parentFolder.items ?? [];
      const lowerName = name.toLowerCase();
      if (siblings.some((s) => s.name.toLowerCase() === lowerName)) {
        return t('dialFileManager.folderConflict');
      }
      return null;
    },
    [t],
  );

  const onDownloadFiles = useCallback(
    (dialFiles: DialFile[]) => {
      const run = async () => {
        setIsDownloading(true);
        try {
          const filename =
            dialFiles.length === 1
              ? dialFiles[0].nodeType === DialFileNodeType.ITEM
                ? dialFiles[0].name
                : `${dialFiles[0].name}.zip`
              : 'files.zip';
          const destination = await prepareDownloadDestination(
            filename,
            dialFiles.length === 1 && dialFiles[0].nodeType === DialFileNodeType.ITEM
              ? (dialFiles[0].contentType ?? 'application/octet-stream')
              : 'application/zip',
          );
          if (destination.type === DownloadDestinationType.Cancelled) return;

          if (
            dialFiles.length === 1 &&
            dialFiles[0].nodeType === DialFileNodeType.ITEM
          ) {
            const file = dialFiles[0];
            if (!file.bucket) throw new Error('File is missing bucket');
            const filePath = resolveDialFileApiPath(file, file.bucket, rootLabel);
            const response = await downloadFile(file.bucket, filePath);
            await triggerBrowserDownload(response, file.name, destination);
          } else {
            const archiveItems = dialFiles.map((f) => ({
              bucket: f.bucket ?? bucket,
              path: resolveDialFileApiPath(f, f.bucket ?? bucket, rootLabel),
              name: f.name,
              nodeType: f.nodeType === DialFileNodeType.FOLDER ? 'FOLDER' as const : 'ITEM' as const,
            }));
            const response = await downloadArchive(archiveItems);
            await triggerBrowserDownload(response, filename, destination);
          }
        } catch {
          onNotification?.({
            variant: NotificationVariant.Error,
            message: t(
              dialFiles.length === 1
                ? DialFileManagerI18nKeys.DownloadFileError
                : DialFileManagerI18nKeys.DownloadFilesError,
            ),
          });
        } finally {
          setIsDownloading(false);
        }
      };
      void run();
    },
    [bucket, rootLabel, onNotification, t],
  );

  const onDeleteFiles = useCallback(
    (deletedItems: DialDeletedItem[], sourceFolder: string) => {
      if (deletedItems.length === 0) return;

      const run = async () => {
        setIsDeleting(true);

        const dtos = deletedItems.map((item) => {
          const isFolder = item.nodeType === DialFileNodeType.FOLDER;
          const apiPath = virtualPathToApiPath(item.sourceUrl, rootLabel);
          const relPath = isFolder ? apiPath : apiPath.replace(/\/$/, '');
          const segments = item.sourceUrl.split('/').filter(Boolean);
          const name = segments[segments.length - 1] ?? relPath;
          const { bucket: itemBucket, path: itemPath } =
            activeTab === DialFileManagerTabs.Shared
              ? resolveOwnerCoords(relPath, sharedRootMetaRef.current, bucket)
              : { bucket, path: relPath };
          return {
            bucket: itemBucket,
            path: itemPath,
            name,
            nodeType: (isFolder ? 'FOLDER' : 'ITEM') as 'ITEM' | 'FOLDER',
          };
        });

        try {
          const { results } = await deleteFiles(dtos);
          const failedResults = results.filter((r) => !r.success);
          const failedCount = failedResults.length;
          const successCount = results.length - failedCount;
          const firstSuccessfulResult = results.find((r) => r.success);
          const firstSuccessfulDto =
            dtos.find((item) => item.path === firstSuccessfulResult?.path) ?? dtos[0];

          if (successCount > 0) {
            onNotification?.({
              variant: NotificationVariant.Success,
              title: t(
                successCount === 1
                  ? DialFileManagerI18nKeys.ItemDeletedSuccessfully
                  : DialFileManagerI18nKeys.ItemsDeletedSuccessfully,
              ),
              message: t(
                successCount === 1
                  ? DialFileManagerI18nKeys.ItemDeletedFromFolder
                  : DialFileManagerI18nKeys.ItemsDeletedFromFolder,
                {
                  count: String(successCount),
                  fileName: firstSuccessfulDto?.name ?? '',
                  folder: sourceFolder || rootLabel,
                },
              ),
            });
          }

          if (failedCount > 0) {
            const failedNames = failedResults.slice(0, 3).map((result) => {
              const failedDto = dtos.find((item) => item.path === result.path);
              return failedDto?.name ?? result.path;
            });
            const restCount = failedCount - failedNames.length;

            onNotification?.({
              variant: NotificationVariant.Error,
              title: t(DialFileManagerI18nKeys.ItemsDeletingFailed),
              message: t(DialFileManagerI18nKeys.SomeItemsNotDeleted, {
                files: failedNames.join(', '),
                rest:
                  restCount > 0
                    ? t(DialFileManagerI18nKeys.AndOtherItems, { count: String(restCount) })
                    : '',
              }),
            });
          }
        } catch {
          onNotification?.({
            variant: NotificationVariant.Error,
            message: t(DialFileManagerI18nKeys.DeleteFilesError),
          });
        }

        const deletedFolderPaths = dtos
          .filter((d) => d.nodeType === 'FOLDER')
          .map((d) => (d.path.endsWith('/') ? d.path : `${d.path}/`));

        const affectedFolderKeys = new Set<string>(
          dtos.map((d) => {
            if (d.nodeType === 'FOLDER') {
              return d.path.endsWith('/') ? d.path : `${d.path}/`;
            }
            const lastSlash = d.path.lastIndexOf('/');
            return lastSlash > 0 ? d.path.slice(0, lastSlash + 1) : '';
          }),
        );

        setCache((prev) => {
          const next = new Map(prev);
          affectedFolderKeys.forEach((k) => next.delete(k));
          return next;
        });
        setListingPermissionsCache((prev) => {
          const next = new Map(prev);
          affectedFolderKeys.forEach((k) => next.delete(k));
          return next;
        });

        const isCurrentFolderDeleted = deletedFolderPaths.some(
          (fp) => folderPath === fp || folderPath.startsWith(fp),
        );
        if (isCurrentFolderDeleted) {
          setFolderPath((prev) => prev.replace(/[^/]+\/$/, ''));
        }

        setRetryCounter((c) => c + 1);
        setIsDeleting(false);
      };
      void run();
    },
    [activeTab, bucket, rootLabel, t, folderPath, onNotification],
  );

  const path = folderPath ? `/${rootLabel}/${folderPath}` : `/${rootLabel}`;

  const currentFolder = useMemo((): DialFile | undefined => {
    const root = items[0];
    if (!root) return undefined;
    if (normalizeVirtualPath(path) === normalizeVirtualPath(`/${rootLabel}`)) {
      return root;
    }
    return findFolderByVirtualPath(root.items ?? [], path);
  }, [items, path, rootLabel]);

  const onRenameValidate = useCallback(
    (value: string, item: DialFile): string | null => {
      if (!value || value.trim() === '') {
        return t(DialFileManagerI18nKeys.RenameNameEmpty);
      }
      if (value === HIDDEN_FILE) {
        return t(DialFileManagerI18nKeys.RenameReservedName);
      }
      if (/[/\\]/.test(value)) {
        return t(DialFileManagerI18nKeys.RenameInvalidChars);
      }
      if (forbiddenSymbolsRegExp != null && forbiddenSymbolsRegExp.test(value)) {
        return t(DialFileManagerI18nKeys.RenameInvalidChars);
      }
      if (value.length > 255) {
        return t(DialFileManagerI18nKeys.RenameNameTooLong);
      }
      const siblings = currentFolder?.items ?? [];
      const lowerValue = value.toLowerCase();
      if (
        siblings.some(
          (s) => s.path !== item.path && s.name.toLowerCase() === lowerValue,
        )
      ) {
        return t(DialFileManagerI18nKeys.RenameDuplicateName);
      }
      return null;
    },
    [t, forbiddenSymbolsRegExp, currentFolder],
  );

  const onMoveToFiles = useCallback(
    (copiedItems: DialCopiedItem[]) => {
      if (copiedItems.length === 0) return;

      const run = async () => {
        setIsRenaming(true);

        const dtos = copiedItems.map((item) => {
          const isFolder = item.nodeType === DialFileNodeType.FOLDER;
          const sourcePath = virtualPathToApiPath(item.sourceUrl, rootLabel);
          const destinationPath = virtualPathToApiPath(item.destinationUrl, rootLabel);
          const segments = item.sourceUrl.split('/').filter(Boolean);
          const name = segments[segments.length - 1] ?? sourcePath;
          return {
            bucket,
            sourcePath: isFolder
              ? sourcePath.endsWith('/')
                ? sourcePath
                : `${sourcePath}/`
              : sourcePath.replace(/\/$/, ''),
            destinationPath: isFolder
              ? destinationPath.endsWith('/')
                ? destinationPath
                : `${destinationPath}/`
              : destinationPath.replace(/\/$/, ''),
            nodeType: (isFolder ? 'FOLDER' : 'ITEM') as 'ITEM' | 'FOLDER',
            name,
          };
        });

        try {
          const { results } = await renameFiles(dtos);
          const failedCount = results.filter((r) => !r.success).length;

          if (failedCount > 0 && failedCount < results.length) {
            onNotification?.({
              variant: NotificationVariant.Error,
              message: t(DialFileManagerI18nKeys.RenamePartialError, {
                count: String(failedCount),
              }),
            });
          } else if (failedCount === results.length) {
            onNotification?.({
              variant: NotificationVariant.Error,
              message: t(DialFileManagerI18nKeys.RenameError),
            });
          }

          const renamedFolderDto = dtos.find(
            (dto) =>
              dto.nodeType === 'FOLDER' &&
              results.some(
                (result) => result.success && result.sourcePath === dto.sourcePath,
              ),
          );
          if (renamedFolderDto != null) {
            const srcPrefix = renamedFolderDto.sourcePath.endsWith('/')
              ? renamedFolderDto.sourcePath
              : `${renamedFolderDto.sourcePath}/`;
            if (folderPath === srcPrefix || folderPath.startsWith(srcPrefix)) {
              const destPrefix = renamedFolderDto.destinationPath.endsWith('/')
                ? renamedFolderDto.destinationPath
                : `${renamedFolderDto.destinationPath}/`;
              setFolderPath(folderPath.replace(srcPrefix, destPrefix));
            }
          }
        } catch {
          onNotification?.({
            variant: NotificationVariant.Error,
            message: t(DialFileManagerI18nKeys.RenameError),
          });
        } finally {
          const affectedKeys = new Set(
            dtos.flatMap((dto) => {
              const normalizedSource = dto.sourcePath.replace(/\/$/, '');
              const normalizedDest = dto.destinationPath.replace(/\/$/, '');
              const srcParent =
                normalizedSource.lastIndexOf('/') > 0
                  ? normalizedSource.slice(0, normalizedSource.lastIndexOf('/') + 1)
                  : '';
              const destParent =
                normalizedDest.lastIndexOf('/') > 0
                  ? normalizedDest.slice(0, normalizedDest.lastIndexOf('/') + 1)
                  : '';
              return [srcParent, destParent];
            }),
          );

          setCache((prev) => {
            const next = new Map(prev);
            affectedKeys.forEach((k) => next.delete(k));
            return next;
          });
          setRetryCounter((c) => c + 1);
          setIsRenaming(false);
        }
      };

      void run();
    },
    [bucket, rootLabel, folderPath, onNotification, t],
  );

  const clearUploadBatch = useCallback(() => {
    setUploadBatchState(null);
  }, []);

  const canWriteCurrentFolder = hasDialFileWritePermission(currentFolder);

  const uploadEnabled = useMemo((): boolean => {
    if (activeTab === DialFileManagerTabs.Organization) return false;
    if (activeTab === DialFileManagerTabs.Shared && folderPath === '') return false;
    return canWriteCurrentFolder;
  }, [activeTab, folderPath, canWriteCurrentFolder]);

  const visibleColumns = useMemo(
    (): FileManagerColumnKey[] =>
      activeTab === DialFileManagerTabs.Shared ? COLUMNS_WITH_AUTHOR : COLUMNS_WITHOUT_AUTHOR,
    [activeTab],
  );

  const actionLabels = useMemo(() => {
    const labels: Partial<Record<DialFileManagerActions, string>> = {
      [DialFileManagerActions.Download]: t(DialFileManagerI18nKeys.Download),
    };
    if (activeTab === DialFileManagerTabs.MyFiles) {
      labels[DialFileManagerActions.Delete] = t(DialFileManagerI18nKeys.DeleteAction);
      if (uploadEnabled) {
        labels[DialFileManagerActions.Rename] = t(DialFileManagerI18nKeys.RenameAction);
      }
    }
    return labels;
  }, [activeTab, uploadEnabled, t]);

  const sharedWithMeIds = useMemo(
    (): string[] | undefined =>
      activeTab === DialFileManagerTabs.Shared ? sharedRootIds : undefined,
    [activeTab, sharedRootIds],
  );

  const disabledNewButtonTooltip = t(DialFileManagerI18nKeys.NoPermissionToCreate);

  return {
    items,
    isLoading,
    error,
    path,
    onPathChange,
    retry,
    onUploadFiles,
    onValidateUpload,
    uploadBatchState,
    cancelUpload,
    clearUploadBatch,
    onCreateFolder,
    onCreateFolderValidate,
    isCreatingFolder,
    onDownloadFiles,
    isDownloading,
    onDeleteFiles,
    isDeleting,
    onRenameValidate,
    onMoveToFiles,
    isRenaming,
    uploadEnabled,
    isNewButtonDisabled: !uploadEnabled,
    disabledNewButtonTooltip,
    visibleColumns,
    dateLocale: i18n.language,
    dateOptions: DATE_OPTIONS,
    actionLabels,
    sharedWithMeIds,
  };
};
