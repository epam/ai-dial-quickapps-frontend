import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { NotificationVariant } from '@epam/ai-dial-ui-kit';

import type {
  DialCopiedItem,
  DialDeletedItem,
  DialFile,
  DialUploadFileItem,
} from '@epam/ai-dial-react-file-manager';
import {
  DialFileManagerActions,
  DialFileManagerTabs,
  DialFileNodeType,
  FileManagerColumnKey,
} from '@epam/ai-dial-react-file-manager';

import { DIAL_HIDDEN_FOLDER_MARKER } from '@/constants/dial-paths';
import { DialFileManagerI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import type {
  FileManagerNotification,
  FileUploadBatchState,
  FileUploadEntry,
  FileUploadValidationResult,
  SharedRootMeta,
} from '@/types/file-manager';
import { FileUploadStatus } from '@/types/file-manager';
import { Translation } from '@/types/translation';
import {
  buildFromCache,
  ensureTrailingSlash,
  fetchFolderListing,
  findFolderByVirtualPath,
  getDownloadFileName,
  getParentApiPath,
  hasDialFileWritePermission,
  mapCorePermissions,
  mergeCreatedFolderIntoCache,
  normalizeVirtualPath,
  parseNewFolderVirtualPath,
  resolveOwnerCoords,
  updateUploadEntry,
} from '@/utils/dial-file-manager';
import { resolveDialFileApiPath, virtualPathToApiPath } from '@/utils/dial-file-path';
import { FilesApiNodeType, type ListFilesItem } from '@/types/dial-files';
import {
  createFolder,
  deleteFiles,
  downloadArchive,
  downloadFile,
  renameFiles,
  uploadFile,
} from '@/utils/dial-files-api';
import {
  DownloadDestinationType,
  prepareDownloadDestination,
  triggerBrowserDownload,
} from '@/utils/file-download';
import { sanitizeFileName } from '@/utils/file-name';
import { safeDecodeURI } from '@/utils/safe-decode-uri';

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
  onMoveToFiles: (items: DialCopiedItem[], sourceFolder: string, destinationFolder: string) => void;
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

const UPLOAD_CONCURRENCY = 3;

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

export const useDialFileManager = ({
  bucket,
  rootLabel = 'My files',
  activeTab = DialFileManagerTabs.MyFiles,
  onNotification,
  forbiddenSymbolsRegExp,
}: UseDialFileManagerOptions): UseDialFileManagerResult => {
  const { t, language } = useTranslation(Translation.Common);
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

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { items: flat, permissions } = await fetchFolderListing(
          activeTab,
          bucket,
          folderPath,
          sharedRootMetaRef.current,
        );
        if (isCancelled) return;
        setCache((prev) => new Map(prev).set(folderPath, flat));
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
      } catch {
        if (!isCancelled) setError(DialFileManagerI18nKeys.Error);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isCancelled = true;
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

      setFolderPath(stripped && !stripped.endsWith('/') ? `${stripped}/` : stripped);
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
              setUploadBatchState((prev) => updateUploadEntry(prev, i, FileUploadStatus.Cancelled));
              continue;
            }

            setUploadBatchState((prev) =>
              updateUploadEntry(prev, i, { status: FileUploadStatus.Uploading, percent: 0 }),
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
                      updateUploadEntry(prev, i, { status: FileUploadStatus.Uploading, percent }),
                    );
                  },
                },
              );
              setUploadBatchState((prev) =>
                updateUploadEntry(prev, i, { status: FileUploadStatus.Completed, percent: 100 }),
              );
              successCount += 1;
            } catch {
              const status = controller.signal.aborted
                ? FileUploadStatus.Cancelled
                : FileUploadStatus.Failed;
              if (status === FileUploadStatus.Failed) failedCount += 1;
              setUploadBatchState((prev) => updateUploadEntry(prev, i, status));
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
      const { parentVirtualPath, name } = parseNewFolderVirtualPath(folderVirtualPath, rootLabel);
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
        return t(DialFileManagerI18nKeys.FolderNameEmpty);
      }
      if (/[/\\]/.test(name)) {
        return t(DialFileManagerI18nKeys.FolderNameInvalidChars);
      }
      if (name.startsWith('.')) {
        return t(DialFileManagerI18nKeys.FolderNameHidden);
      }
      if (name === DIAL_HIDDEN_FOLDER_MARKER) {
        return t(DialFileManagerI18nKeys.FolderNameReserved);
      }
      if (name.length > 255) {
        return t(DialFileManagerI18nKeys.FolderNameTooLong);
      }
      const siblings = parentFolder.items ?? [];
      const lowerName = name.toLowerCase();
      if (siblings.some((s) => s.name.toLowerCase() === lowerName)) {
        return t(DialFileManagerI18nKeys.FolderConflict);
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
          const isSingleFile =
            dialFiles.length === 1 && dialFiles[0].nodeType === DialFileNodeType.ITEM;
          const filename = getDownloadFileName(dialFiles);
          const destination = await prepareDownloadDestination(
            filename,
            isSingleFile
              ? (dialFiles[0].contentType ?? 'application/octet-stream')
              : 'application/zip',
          );
          if (destination.type === DownloadDestinationType.Cancelled) return;

          if (isSingleFile) {
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
              nodeType:
                f.nodeType === DialFileNodeType.FOLDER
                  ? FilesApiNodeType.Folder
                  : FilesApiNodeType.Item,
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
            nodeType: isFolder ? FilesApiNodeType.Folder : FilesApiNodeType.Item,
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
          .filter((d) => d.nodeType === FilesApiNodeType.Folder)
          .map((d) => ensureTrailingSlash(d.path));

        const affectedFolderKeys = new Set<string>(
          dtos.map((d) =>
            d.nodeType === FilesApiNodeType.Folder
              ? ensureTrailingSlash(d.path)
              : getParentApiPath(d.path),
          ),
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

        const isCurrentFolderDeleted = deletedFolderPaths.some((fp) => folderPath.startsWith(fp));
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
      if (value === DIAL_HIDDEN_FOLDER_MARKER) {
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
      if (siblings.some((s) => s.path !== item.path && s.name.toLowerCase() === lowerValue)) {
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
            sourcePath: isFolder ? ensureTrailingSlash(sourcePath) : sourcePath.replace(/\/$/, ''),
            destinationPath: isFolder
              ? ensureTrailingSlash(destinationPath)
              : destinationPath.replace(/\/$/, ''),
            nodeType: isFolder ? FilesApiNodeType.Folder : FilesApiNodeType.Item,
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
              dto.nodeType === FilesApiNodeType.Folder &&
              results.some((result) => result.success && result.sourcePath === dto.sourcePath),
          );
          if (renamedFolderDto != null) {
            const srcPrefix = ensureTrailingSlash(renamedFolderDto.sourcePath);
            if (folderPath.startsWith(srcPrefix)) {
              const destPrefix = ensureTrailingSlash(renamedFolderDto.destinationPath);
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
            dtos.flatMap((dto) => [
              getParentApiPath(dto.sourcePath),
              getParentApiPath(dto.destinationPath),
            ]),
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
    dateLocale: language,
    dateOptions: DATE_OPTIONS,
    actionLabels,
    sharedWithMeIds,
  };
};
