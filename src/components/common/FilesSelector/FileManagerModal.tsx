'use client';
import { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ButtonVariant,
  DialButton,
  DialFileManager,
  DialFileManagerActions,
  DialFileManagerTabs,
  DialFileNodeType,
  DialNeutralButton,
  DialPopup,
  Spinner as DialSpinner,
  GridSelectionMode,
  NOT_ALLOWED_SYMBOLS_REGEXP,
  NotificationVariant,
  PopupSize,
  useDialFileManagerTabs,
  type DialFile,
  type FileManagerGridRow,
} from '@epam/ai-dial-ui-kit';

import { DialFileManagerI18nKeys } from '@/constants/i18n';
import { useDialFileManager } from '@/hooks/useDialFileManager';
import { useTranslation } from '@/hooks/useTranslation';
import { FileUploadStatus } from '@/types/file-manager';
import { Translation } from '@/types/translation';
import { isHiddenPath } from '@/utils/dial-file-path';
import { listFiles } from '@/utils/dial-files-api';
import { fetchDialBucket } from '@/utils/dialClient';

import UploadProgressModal from './UploadProgressModal';

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

const FileManagerModal: FC<FileManagerModalProps> = ({ isOpen, initialFileIds, onClose }) => {
  const { t } = useTranslation(Translation.Common);
  const [bucket, setBucket] = useState('');
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchDialBucket()
      .then(setBucket)
      .catch(() => setBucket(''));
  }, [isOpen]);

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
    }),
    [t],
  );

  const {
    activeTab,
    handleTabChange,
    tabs: allTabs,
  } = useDialFileManagerTabs(tabLabels, DialFileManagerTabs.MyFiles);

  const rootLabel = tabLabels[activeTab] || tabLabels[DialFileManagerTabs.MyFiles];

  const tabs = useMemo(
    () => allTabs?.filter((tab) => tab.id !== DialFileManagerTabs.Review),
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
  } = useDialFileManager({
    bucket,
    activeTab,
    rootLabel,
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
          .filter((item) => item.nodeType === 'ITEM' && !isHiddenPath(item.path))
          .map((item) => item.path);
      } catch {
        return [];
      }
    },
    [bucket],
  );

  const handleAttach = useCallback(async () => {
    const fileIds: string[] = [];
    for (const f of selectedFiles) {
      if (f.nodeType === DialFileNodeType.FOLDER) {
        const folderFileIds = await expandFolderFileIds(f);
        fileIds.push(...folderFileIds);
      } else if (f.nodeType === DialFileNodeType.ITEM && !isHiddenPath(f.path)) {
        fileIds.push(f.id ?? f.path);
      }
    }
    onClose(fileIds);
  }, [selectedFiles, onClose, expandFolderFileIds]);

  const handleCancel = useCallback(() => {
    onClose([]);
  }, [onClose]);

  const handleUploadCancel = useCallback(() => {
    cancelUpload();
    clearUploadBatch();
  }, [cancelUpload, clearUploadBatch]);

  const isOperationInProgress =
    isDownloading || isDeleting || isRenaming || isCreatingFolder || uploadBatchState != null;

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

  const treeOptions = useMemo(() => ({ actionLabels }), [actionLabels]);

  const toolbarOptions = useMemo(
    () => ({
      tabs,
      activeTab,
      onTabChange: handleTabChangeWithReset,
      showHiddenFilesToggle: true,
      hiddenFilesSwitcherLabel: t(DialFileManagerI18nKeys.HiddenFiles),
      showHiddenFilesLabel: t(DialFileManagerI18nKeys.ShowHiddenFiles),
      hideHiddenFilesLabel: t(DialFileManagerI18nKeys.HideHiddenFiles),
      isNewButtonDisabled,
      disabledNewButtonTooltip,
      newActions: {
        uploadFiles: { label: t(DialFileManagerI18nKeys.Upload) },
        newFolder: { label: t(DialFileManagerI18nKeys.NewFolder) },
      },
    }),
    [tabs, activeTab, handleTabChangeWithReset, t, isNewButtonDisabled, disabledNewButtonTooltip],
  );

  const bulkActionsToolbarOptions = useMemo(
    () => ({
      getSelectionLabel: (count: number) => t(DialFileManagerI18nKeys.ItemsSelected, { count }),
      actionLabels,
    }),
    [t, actionLabels],
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
        cancel: t('Cancel'),
      },
      strategyLabels: {
        replaceAll: t(DialFileManagerI18nKeys.ConflictReplaceAll),
        duplicateAll: t(DialFileManagerI18nKeys.ConflictDuplicateAll),
        decideForEach: t(DialFileManagerI18nKeys.ConflictDecideForEach),
      },
      confirmLabel: t('Attach'),
      cancelLabel: t('Cancel'),
    }),
    [t],
  );

  const deleteConfirmationOptions = useMemo(
    () => ({
      cancelLabel: t('Cancel'),
      confirmLabel: t(DialFileManagerI18nKeys.DeleteConfirmButton),
      titleRenderer: (names: string[]) =>
        names.length === 1
          ? t(DialFileManagerI18nKeys.DeleteConfirmTitleSingle)
          : t(DialFileManagerI18nKeys.DeleteConfirmTitleMultiple),
      contentRenderer: (names: string[]) =>
        names.length === 1
          ? `${t(DialFileManagerI18nKeys.DeleteConfirmBodySingle)} "${names[0]}"?`
          : `${t(DialFileManagerI18nKeys.DeleteConfirmBodyMultiple)} ${names.length} ${t(DialFileManagerI18nKeys.DeleteConfirmBodyItems)}`,
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

  const uploadProgressText = useMemo(() => {
    if (uploadBatchState == null) return '';
    const done = uploadBatchState.files.filter(
      (f) => f.status !== FileUploadStatus.Uploading,
    ).length;
    return t(DialFileManagerI18nKeys.UploadProgressSummary, {
      done: String(done),
      total: String(uploadBatchState.files.length),
    });
  }, [uploadBatchState, t]);

  const notificationBgClass =
    notification?.variant === NotificationVariant.Error
      ? 'bg-error'
      : notification?.variant === NotificationVariant.Success
        ? 'bg-success'
        : 'bg-layer-3';

  return (
    <>
      <DialPopup
        open={isOpen}
        header={t(DialFileManagerI18nKeys.Title)}
        size={PopupSize.Lg}
        className="flex !h-[min(800px,100dvh)] w-full flex-col !bg-layer-2 [&>[aria-label='popup-description']]:flex [&>[aria-label='popup-description']]:min-h-0 [&>[aria-label='popup-description']]:flex-col"
        onClose={handleCancel}
        hideClose={true}
        footer={
          <div className="flex justify-end gap-2 px-6 py-4">
            <DialNeutralButton label={t('Cancel')} onClick={handleCancel} />
            <DialButton
              variant={ButtonVariant.Primary}
              label={t(DialFileManagerI18nKeys.Attach)}
              disabled={selectedFiles.length === 0 || isLoading || isOperationInProgress}
              onClick={handleAttach}
            />
          </div>
        }
      >
        {notification != null && (
          <div
            className={`dial-small-text flex flex-col gap-1 px-6 py-3 text-primary-bg ${notificationBgClass}`}
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
            <DialButton
              variant={ButtonVariant.Primary}
              label={t(DialFileManagerI18nKeys.Retry)}
              onClick={retry}
            />
          </div>
        ) : (
          <div className="relative flex min-h-0 w-full grow overflow-auto bg-layer-2">
            <DialFileManager
              className="min-h-0 w-full grow bg-layer-2"
              gridClassName="size-full"
              items={items}
              path={path}
              onPathChange={onPathChange}
              filesLoading={isLoading}
              selectedPaths={selectedPaths}
              onSelectedPathsChange={setSelectedPaths}
              navigationPanelOptions={{ searchable: false }}
              gridOptions={gridOptions}
              treeOptions={treeOptions}
              toolbarOptions={toolbarOptions}
              bulkActionsToolbarOptions={bulkActionsToolbarOptions}
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
                className="absolute inset-0 z-[52] flex items-center justify-center bg-blackout md:p-4"
              >
                <DialSpinner
                  size={32}
                  fullWidth={false}
                  ariaLabel={t(DialFileManagerI18nKeys.Downloading)}
                />
              </div>
            )}
            {isDeleting && (
              <div
                aria-live="polite"
                className="absolute inset-0 z-[52] flex items-center justify-center bg-blackout md:p-4"
              >
                <DialSpinner
                  size={32}
                  fullWidth={false}
                  ariaLabel={t(DialFileManagerI18nKeys.DeletingLabel)}
                />
              </div>
            )}
            {isRenaming && (
              <div
                aria-live="polite"
                className="absolute inset-0 z-[52] flex items-center justify-center bg-blackout md:p-4"
              >
                <DialSpinner
                  size={32}
                  fullWidth={false}
                  ariaLabel={t(DialFileManagerI18nKeys.RenamingLabel)}
                />
              </div>
            )}
          </div>
        )}
      </DialPopup>

      {uploadBatchState != null && (
        <UploadProgressModal
          batchState={uploadBatchState}
          uploadProgressTitle={t(DialFileManagerI18nKeys.UploadProgressTitle)}
          uploadProgressText={uploadProgressText}
          cancelLabel={t('Cancel')}
          onCancel={handleUploadCancel}
        />
      )}
    </>
  );
};

export default memo(FileManagerModal);
