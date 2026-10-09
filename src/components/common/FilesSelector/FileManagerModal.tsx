import { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ButtonAppearance,
  ButtonVariant,
  PrimaryButton,
  Popup,
  Spinner,
  NOT_ALLOWED_SYMBOLS_REGEXP,
  mergeClasses,
  NotificationVariant,
  PopupSize,
  TransferQueue,
  type TransferQueueLabels,
} from '@epam/ai-dial-ui-kit';

import {
  DialFileManager,
  DialFileManagerActions,
  DialFileManagerTabs,
  DialFileNodeType,
  GridSelectionMode,
  useDialFileManagerTabs,
  type DialFile,
  type FileManagerGridRow,
} from '@epam/ai-dial-react-file-manager';

import { CommonI18nKeys, DialFileManagerI18nKeys } from '@/constants/i18n';
import { useAuthContext } from '@/context/AuthContext';
import { useDialFileSources } from '@/hooks/use-dial-file-sources';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';
import { isHiddenPath } from '@/utils/dial-file-path';
import {
  isUploadInProgress,
  toTransferQueueItems,
  type DialFileSourceLabels,
} from '@/utils/dial-file-manager';
import { FilesApiNodeType } from '@/types/dial-files';
import { listFiles } from '@/utils/dial-files-api';

interface FileManagerModalProps {
  isOpen: boolean;
  initialFileIds?: string[];
  onClose: (fileIds: string[]) => void;
}

interface Notification {
  variant: NotificationVariant;
  title?: string;
  message: string;
}

// Error and Success get their own background; every other variant uses the neutral one.
const NOTIFICATION_BG_CLASSES: Partial<Record<NotificationVariant, string>> = {
  [NotificationVariant.Error]: 'bg-error',
  [NotificationVariant.Success]: 'bg-success',
};
const DEFAULT_NOTIFICATION_BG_CLASS = 'bg-layer-sunken';

const FileManagerModal: FC<FileManagerModalProps> = ({ isOpen, initialFileIds, onClose }) => {
  const { t } = useTranslation(Translation.Common);
  const { user } = useAuthContext();
  const bucket = user?.bucket ?? '';
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const tabLabels = useMemo(
    () => ({
      [DialFileManagerTabs.MyFiles]: t(DialFileManagerI18nKeys.TabMyFiles),
      [DialFileManagerTabs.Shared]: t(DialFileManagerI18nKeys.TabShared),
      [DialFileManagerTabs.Organization]: t(DialFileManagerI18nKeys.TabOrganization),
      [DialFileManagerTabs.Review]: '',
      [DialFileManagerTabs.All]: t(DialFileManagerI18nKeys.TabAll),
    }),
    [t],
  );

  const {
    activeTab,
    handleTabChange,
    tabs: allTabs,
  } = useDialFileManagerTabs(tabLabels, DialFileManagerTabs.MyFiles);

  const sourceLabels = useMemo(
    (): DialFileSourceLabels => ({
      [DialFileManagerTabs.MyFiles]: tabLabels[DialFileManagerTabs.MyFiles],
      [DialFileManagerTabs.Shared]: tabLabels[DialFileManagerTabs.Shared],
      [DialFileManagerTabs.Organization]: tabLabels[DialFileManagerTabs.Organization],
    }),
    [tabLabels],
  );

  // Review is not used here; All shows the three storage sections side by side.
  const tabs = useMemo(
    () => allTabs?.filter((tab) => tab.value !== DialFileManagerTabs.Review),
    [allTabs],
  );

  const handleNotification = useCallback((n: Notification) => {
    setNotification(n);
  }, []);

  const {
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
    cancelUploadItem,
    clearUploadBatch,
    onCreateFolder,
    onCreateFolderValidate,
    isCreatingFolder,
    onDownloadFiles,
    isDownloading,
    onDeleteFiles,
    isDeleting,
    onMoveToFiles,
    onRenameValidate,
    isRenaming,
    uploadEnabled,
    isNewButtonDisabled,
    disabledNewButtonTooltip,
    visibleColumns,
    dateLocale,
    dateOptions,
    actionLabels: tabActionLabels,
    sharedWithMeIds,
  } = useDialFileSources({
    bucket,
    activeTab,
    labels: sourceLabels,
    onNotification: handleNotification,
    forbiddenSymbolsRegExp: NOT_ALLOWED_SYMBOLS_REGEXP,
  });

  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set());

  const hasInitialized = useRef(false);

  const handleTabChangeWithReset = useCallback(
    (tab: DialFileManagerTabs) => {
      setSelectedPaths(new Set());
      handleTabChange(tab);
    },
    [handleTabChange],
  );

  const filesByPath = useMemo(() => {
    const result = new Map<string, DialFile>();
    const collect = (nodes: DialFile[]) => {
      nodes.forEach((item) => {
        if (item.nodeType === DialFileNodeType.ITEM || item.nodeType === DialFileNodeType.FOLDER) {
          result.set(item.path, item);
          if (item.id) result.set(item.id, item);
        }
        if (item.items) collect(item.items);
      });
    };
    collect(items);
    return result;
  }, [items]);

  const selectedFiles = useMemo(
    () =>
      Array.from(selectedPaths)
        .map((p) => filesByPath.get(p))
        .filter((f): f is DialFile => f != null),
    [filesByPath, selectedPaths],
  );

  // Reset selection when modal closes
  useEffect(() => {
    const reset = () => {
      setSelectedPaths(new Set());
      hasInitialized.current = false;
    };
    if (!isOpen) reset();
  }, [isOpen]);

  // Pre-populate selection from initialFileIds once the file tree is loaded.
  // filesByPath maps both the DIAL Core path (DialFile.id) and virtual path, so
  // we look up by the stored DIAL Core ID and set the virtual path DialFileManager uses.
  useEffect(() => {
    if (hasInitialized.current || filesByPath.size === 0) return;
    hasInitialized.current = true;
    if (!initialFileIds?.length) return;
    const paths = new Set<string>();
    for (const id of initialFileIds) {
      const file = filesByPath.get(id);
      if (file) paths.add(file.path);
    }
    const apply = () => setSelectedPaths(paths);
    if (paths.size > 0) apply();
  }, [filesByPath, initialFileIds]);

  const expandFolderFileIds = useCallback(
    async (folder: DialFile): Promise<string[]> => {
      const folderBucket = folder.bucket ?? bucket;
      const folderId = folder.id ?? '';
      const prefix = `files/${folderBucket}/`;
      const folderRelPath = folderId.startsWith(prefix) ? folderId.slice(prefix.length) : '';
      try {
        const result = await listFiles({
          bucket: folderBucket,
          path: folderRelPath,
          recursive: true,
        });
        return result.items
          .filter((item) => item.nodeType === FilesApiNodeType.Item && !isHiddenPath(item.path))
          .map((item) => item.path);
      } catch {
        return [];
      }
    },
    [bucket],
  );

  const handleAttach = useCallback(async () => {
    const fileIds = new Set<string>();
    // Files the tree hasn't resolved yet (e.g. in an unvisited folder/tab) never
    // made it into selectedPaths, so keep them as-is rather than dropping them.
    for (const id of initialFileIds ?? []) {
      if (!filesByPath.has(id)) fileIds.add(id);
    }
    for (const f of selectedFiles) {
      if (f.nodeType === DialFileNodeType.FOLDER) {
        const folderFileIds = await expandFolderFileIds(f);
        folderFileIds.forEach((id) => fileIds.add(id));
      } else if (f.nodeType === DialFileNodeType.ITEM && !isHiddenPath(f.path)) {
        fileIds.add(f.id ?? f.path);
      }
    }
    onClose(Array.from(fileIds));
  }, [selectedFiles, onClose, expandFolderFileIds, initialFileIds, filesByPath]);

  const handleCancel = useCallback(() => {
    onClose([]);
  }, [onClose]);

  // The queue confirms first when files are still uploading or have failed, so closing it
  // cancels whatever is left and dismisses the batch.
  const handleUploadQueueClose = useCallback(() => {
    cancelUpload();
    clearUploadBatch();
  }, [cancelUpload, clearUploadBatch]);

  const isUploading = isUploadInProgress(uploadBatchState);

  const isOperationInProgress =
    isDownloading || isDeleting || isRenaming || isCreatingFolder || isUploading;

  const actionLabels = useMemo(() => {
    const labels: Partial<Record<DialFileManagerActions, string>> = {};
    if (DialFileManagerActions.Download in tabActionLabels) {
      labels[DialFileManagerActions.Download] = t(DialFileManagerI18nKeys.Download);
    }
    if (DialFileManagerActions.Delete in tabActionLabels) {
      labels[DialFileManagerActions.Delete] = t(DialFileManagerI18nKeys.DeleteAction);
    }
    if (DialFileManagerActions.Rename in tabActionLabels) {
      labels[DialFileManagerActions.Rename] = t(DialFileManagerI18nKeys.RenameAction);
    }
    return labels;
  }, [tabActionLabels, t]);

  const gridOptions = useMemo(
    () => ({
      selectionMode: GridSelectionMode.MULTIPLE,
      filterable: false,
      visibleColumns,
      dateLocale,
      dateOptions,
      additionalGridOptions: {
        domLayout: 'normal' as const,
        rowSelection: {
          mode: 'multiRow' as const,
          isRowSelectable: (node: { data?: FileManagerGridRow | null }) => {
            const row = node.data;
            if (row == null) return false;
            if (isHiddenPath(row.path)) return false;
            return true;
          },
        },
      },
      actionLabels,
    }),
    [visibleColumns, dateLocale, dateOptions, actionLabels],
  );

  const treeOptions = useMemo(
    () => ({
      actionLabels,
      // An empty header hides the "Files" heading; the chip row is named instead.
      header: '',
      tabsAriaLabel: t(DialFileManagerI18nKeys.TabsAriaLabel),
      tabs,
      activeTab,
      onTabChange: handleTabChangeWithReset,
    }),
    [actionLabels, t, tabs, activeTab, handleTabChangeWithReset],
  );

  const currentFolderName = useMemo(() => path.split('/').filter(Boolean).pop() ?? '', [path]);
  const navigationPanelOptions = useMemo(
    () => ({
      searchable: true,
      placeholder: t(DialFileManagerI18nKeys.SearchPlaceholder, { folder: currentFolderName }),
    }),
    [t, currentFolderName],
  );

  const toolbarOptions = useMemo(
    () => ({
      showHiddenFilesToggle: true,
      showHiddenFilesLabel: t(DialFileManagerI18nKeys.ShowHiddenFiles),
      hideHiddenFilesLabel: t(DialFileManagerI18nKeys.HideHiddenFiles),
      isNewButtonDisabled,
      disabledNewButtonTooltip,
      newActions: {
        uploadFiles: { label: t(DialFileManagerI18nKeys.Upload) },
        newFolder: { label: t(DialFileManagerI18nKeys.NewFolder) },
      },
    }),
    [t, isNewButtonDisabled, disabledNewButtonTooltip],
  );

  const renameValidationMessages = useMemo(
    () => ({
      emptyName: t(DialFileManagerI18nKeys.RenameNameEmpty),
      duplicateName: t(DialFileManagerI18nKeys.RenameDuplicateName),
    }),
    [t],
  );

  const conflictResolutionPopupOptions = useMemo(
    () => ({
      singleFileTitle: t(DialFileManagerI18nKeys.ConflictSingleTitle),
      multipleFilesTitle: t(DialFileManagerI18nKeys.ConflictMultipleTitle),
      actionLabels: {
        replace: t(DialFileManagerI18nKeys.ConflictReplace),
        duplicate: t(DialFileManagerI18nKeys.ConflictDuplicate),
        cancel: t(CommonI18nKeys.Cancel),
      },
      strategyLabels: {
        replaceAll: t(DialFileManagerI18nKeys.ConflictReplaceAll),
        duplicateAll: t(DialFileManagerI18nKeys.ConflictDuplicateAll),
        decideForEach: t(DialFileManagerI18nKeys.ConflictDecideForEach),
      },
      confirmLabel: t(CommonI18nKeys.Attach),
      cancelLabel: t(CommonI18nKeys.Cancel),
    }),
    [t],
  );

  const deleteConfirmationOptions = useMemo(
    () => ({
      cancelLabel: t(CommonI18nKeys.Cancel),
      closeLabel: t(DialFileManagerI18nKeys.CloseDialog),
      confirmLabel: t(DialFileManagerI18nKeys.DeleteConfirmButton),
      titleRenderer: (names: string[]) =>
        names.length === 1
          ? t(DialFileManagerI18nKeys.DeleteConfirmTitleSingle)
          : t(DialFileManagerI18nKeys.DeleteConfirmTitleMultiple),
      contentRenderer: (names: string[]) => (
        <div className="px-6 py-3 dial-small-text">
          <p className="mb-3 text-secondary">
            {names.length === 1
              ? `${t(DialFileManagerI18nKeys.DeleteConfirmBodySingle)} "${names[0]}"?`
              : `${t(DialFileManagerI18nKeys.DeleteConfirmBodyMultiple)} ${names.length} ${t(DialFileManagerI18nKeys.DeleteConfirmBodyItems)}`}
          </p>
        </div>
      ),
    }),
    [t],
  );

  const getDisabledTooltip = useCallback(
    (row: FileManagerGridRow) => {
      if (isHiddenPath(row.path)) {
        return t(DialFileManagerI18nKeys.AttachingHiddenFilesNotAllowed);
      }
      return undefined;
    },
    [t],
  );

  const uploadQueueItems = useMemo(
    () => (uploadBatchState == null ? [] : toTransferQueueItems(uploadBatchState)),
    [uploadBatchState],
  );

  const uploadQueueLabels = useMemo(
    (): TransferQueueLabels => ({
      cancelItemAriaLabel: (name) => t(DialFileManagerI18nKeys.QueueCancelItem, { name }),
      itemProgressAriaLabel: (name) => t(DialFileManagerI18nKeys.QueueItemProgress, { name }),
      successLabel: t(DialFileManagerI18nKeys.QueueSuccess),
      canceledLabel: t(DialFileManagerI18nKeys.QueueCanceled),
      failedMessage: t(DialFileManagerI18nKeys.QueueFailed),
      warningMessage: t(DialFileManagerI18nKeys.QueueWarning),
      queueProgressAriaLabel: t(DialFileManagerI18nKeys.QueueProgress),
      queueProgressValueText: (completed, total) =>
        t(DialFileManagerI18nKeys.QueueProgressValue, {
          completed: String(completed),
          total: String(total),
        }),
      collapseAriaLabel: t(DialFileManagerI18nKeys.QueueCollapse),
      expandAriaLabel: t(DialFileManagerI18nKeys.QueueExpand),
      closeAriaLabel: t(DialFileManagerI18nKeys.QueueClose),
      closeConfirmHeader: t(DialFileManagerI18nKeys.QueueCloseConfirmHeader),
      closeConfirmDescriptionInProgress: t(DialFileManagerI18nKeys.QueueCloseConfirmInProgress),
      closeConfirmDescriptionFailed: t(DialFileManagerI18nKeys.QueueCloseConfirmFailed),
      closeConfirmDescriptionMixed: t(DialFileManagerI18nKeys.QueueCloseConfirmMixed),
      closeConfirmLabel: t(DialFileManagerI18nKeys.QueueCloseConfirm),
      closeCancelLabel: t(DialFileManagerI18nKeys.QueueCloseCancel),
    }),
    [t],
  );

  const notificationBgClass =
    (notification && NOTIFICATION_BG_CLASSES[notification.variant]) ??
    DEFAULT_NOTIFICATION_BG_CLASS;

  return (
    <>
      <Popup
        open={isOpen}
        header={t(DialFileManagerI18nKeys.AddTitle)}
        size={PopupSize.Lg}
        className="flex !h-[min(800px,100dvh)] w-full flex-col"
        bodyClassName="flex min-h-0 flex-col"
        closeAriaLabel={t(DialFileManagerI18nKeys.CloseDialog)}
        headerDivider
        footerDivider
        onClose={handleCancel}
        additionalButtons={[
          {
            label: t(CommonI18nKeys.Cancel),
            variant: ButtonVariant.Primary,
            appearance: ButtonAppearance.Link,
            onClick: handleCancel,
          },
        ]}
        mainButtons={[
          {
            label: t(DialFileManagerI18nKeys.Add),
            variant: ButtonVariant.Neutral,
            disabled: selectedFiles.length === 0 || isLoading || isOperationInProgress,
            onClick: handleAttach,
          },
        ]}
      >
        {notification != null && (
          <div
            className={mergeClasses(
              'dial-small-text flex flex-col gap-1 px-6 py-3 text-primary',
              notificationBgClass,
            )}
          >
            {notification.title != null && (
              <span className="font-semibold">{notification.title}</span>
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {error != null ? (
          <div role="alert" className="flex flex-col items-center gap-4 p-6">
            <p>{t(DialFileManagerI18nKeys.Error)}</p>
            <PrimaryButton label={t(DialFileManagerI18nKeys.Retry)} onClick={retry} />
          </div>
        ) : (
          // Locked while files upload, as the stacked progress modal used to; the queue stays usable.
          <div
            className="relative flex min-h-0 w-full grow overflow-auto"
            inert={isUploading}
            aria-busy={isUploading}
          >
            <DialFileManager
              className="min-h-0 w-full grow"
              gridClassName="size-full"
              items={items}
              path={path}
              onPathChange={onPathChange}
              filesLoading={isLoading}
              selectedPaths={selectedPaths}
              onSelectedPathsChange={setSelectedPaths}
              navigationPanelOptions={navigationPanelOptions}
              gridOptions={gridOptions}
              treeOptions={treeOptions}
              toolbarOptions={toolbarOptions}
              emptyStateTitle={t(DialFileManagerI18nKeys.Empty)}
              uploadEnabled={uploadEnabled}
              sharedWithMeIds={sharedWithMeIds}
              onUploadFiles={onUploadFiles}
              onValidateUpload={onValidateUpload}
              onCreateFolder={onCreateFolder}
              onCreateFolderValidate={onCreateFolderValidate}
              onDownloadFiles={onDownloadFiles}
              onDeleteFiles={onDeleteFiles}
              onMoveToFiles={onMoveToFiles}
              onRenameValidate={onRenameValidate}
              renameValidationMessages={renameValidationMessages}
              isRenameFileAvailable={uploadEnabled}
              deleteConfirmationOptions={deleteConfirmationOptions}
              conflictResolutionPopupOptions={conflictResolutionPopupOptions}
              forbiddenSymbolsRegExp={NOT_ALLOWED_SYMBOLS_REGEXP}
              forbiddenSymbolsTooltip={t(DialFileManagerI18nKeys.ForbiddenSymbolsTooltip)}
              getDisabledTooltip={getDisabledTooltip}
            />
            {isDownloading && (
              <div
                aria-live="polite"
                className="absolute inset-0 z-[52] flex items-center justify-center bg-backdrop md:p-4"
              >
                <Spinner
                  size={32}
                  fullWidth={false}
                  ariaLabel={t(DialFileManagerI18nKeys.Downloading)}
                />
              </div>
            )}
            {isDeleting && (
              <div
                aria-live="polite"
                className="absolute inset-0 z-[52] flex items-center justify-center bg-backdrop md:p-4"
              >
                <Spinner
                  size={32}
                  fullWidth={false}
                  ariaLabel={t(DialFileManagerI18nKeys.DeletingLabel)}
                />
              </div>
            )}
            {isRenaming && (
              <div
                aria-live="polite"
                className="absolute inset-0 z-[52] flex items-center justify-center bg-backdrop md:p-4"
              >
                <Spinner
                  size={32}
                  fullWidth={false}
                  ariaLabel={t(DialFileManagerI18nKeys.RenamingLabel)}
                />
              </div>
            )}
          </div>
        )}

        {/* Inside the popup so it stays within its focus trap and outside-click boundary;
            `fixed` still pins it to the viewport corner since the popup has no transform. */}
        {uploadBatchState != null && (
          <div className="fixed bottom-4 end-4 z-10 w-[400px] max-w-[calc(100vw-2rem)]">
            <TransferQueue
              title={t(DialFileManagerI18nKeys.UploadProgressTitle)}
              items={uploadQueueItems}
              labels={uploadQueueLabels}
              onCancelItem={cancelUploadItem}
              onClose={handleUploadQueueClose}
            />
          </div>
        )}
      </Popup>
    </>
  );
};

export default memo(FileManagerModal);
