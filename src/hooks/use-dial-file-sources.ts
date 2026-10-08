import { NotificationVariant } from '@epam/ai-dial-ui-kit';
import {
  DialFileManagerTabs,
  type DialCopiedItem,
  type DialDeletedItem,
  type DialFile,
  type DialUploadFileItem,
} from '@epam/ai-dial-react-file-manager';
import { useCallback, useMemo, useRef, useState } from 'react';

import { DialFileManagerI18nKeys } from '@/constants/i18n';
import {
  useDialFileManager,
  type UseDialFileManagerOptions,
  type UseDialFileManagerResult,
} from '@/hooks/use-dial-file-manager';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';
import {
  groupBySource,
  resolveSourceByPath,
  type DialFileSourceLabels,
  type DialFileSourceTab,
} from '@/utils/dial-file-manager';

export interface UseDialFileSourcesOptions
  extends Pick<UseDialFileManagerOptions, 'bucket' | 'onNotification' | 'forbiddenSymbolsRegExp'> {
  activeTab: DialFileManagerTabs;
  labels: DialFileSourceLabels;
}

const SOURCE_TABS: DialFileSourceTab[] = [
  DialFileManagerTabs.MyFiles,
  DialFileManagerTabs.Shared,
  DialFileManagerTabs.Organization,
];

/**
 * Runs one file-manager loader per storage section and exposes the one for `activeTab`. For the
 * combined All tab it exposes the three sections side by side and routes every action to the
 * section that owns the item or the current folder, so an item behaves the same under All as in
 * its own tab. Sections load lazily, the first time they are shown, and keep their state.
 */
export const useDialFileSources = ({
  bucket,
  activeTab,
  labels,
  onNotification,
  forbiddenSymbolsRegExp,
}: UseDialFileSourcesOptions): UseDialFileManagerResult => {
  const { t } = useTranslation(Translation.Common);
  const visitedRef = useRef<Set<DialFileSourceTab>>(new Set([DialFileManagerTabs.MyFiles]));
  const [allPath, setAllPath] = useState(`/${labels[DialFileManagerTabs.MyFiles]}`);

  const isAll = activeTab === DialFileManagerTabs.All;
  if (isAll) SOURCE_TABS.forEach((tab) => visitedRef.current.add(tab));
  else if (activeTab in labels) visitedRef.current.add(activeTab as DialFileSourceTab);

  const shared = {
    bucket,
    onNotification,
    forbiddenSymbolsRegExp,
  };
  const myFiles = useDialFileManager({
    ...shared,
    activeTab: DialFileManagerTabs.MyFiles,
    rootLabel: labels[DialFileManagerTabs.MyFiles],
    isEnabled: visitedRef.current.has(DialFileManagerTabs.MyFiles),
  });
  const sharedWithMe = useDialFileManager({
    ...shared,
    activeTab: DialFileManagerTabs.Shared,
    rootLabel: labels[DialFileManagerTabs.Shared],
    isEnabled: visitedRef.current.has(DialFileManagerTabs.Shared),
  });
  const organization = useDialFileManager({
    ...shared,
    activeTab: DialFileManagerTabs.Organization,
    rootLabel: labels[DialFileManagerTabs.Organization],
    isEnabled: visitedRef.current.has(DialFileManagerTabs.Organization),
  });

  const sources = useMemo(
    (): Record<DialFileSourceTab, UseDialFileManagerResult> => ({
      [DialFileManagerTabs.MyFiles]: myFiles,
      [DialFileManagerTabs.Shared]: sharedWithMe,
      [DialFileManagerTabs.Organization]: organization,
    }),
    [myFiles, sharedWithMe, organization],
  );
  const enabledSources = SOURCE_TABS.filter((tab) => visitedRef.current.has(tab));

  const owner = isAll ? resolveSourceByPath(allPath, labels) : undefined;

  const notifyCrossSource = useCallback(() => {
    onNotification?.({
      variant: NotificationVariant.Error,
      message: t(DialFileManagerI18nKeys.CrossSourceMoveNotAllowed),
    });
  }, [onNotification, t]);

  const onPathChange = useCallback(
    (nextPath?: string) => {
      if (nextPath == null) {
        setAllPath('');
        return;
      }
      const source = resolveSourceByPath(nextPath, labels);
      if (source == null) return;
      sources[source].onPathChange(nextPath);
      setAllPath(nextPath);
    },
    [labels, sources],
  );

  const retry = useCallback(() => {
    enabledSources.forEach((tab) => sources[tab].retry());
  }, [enabledSources, sources]);

  const onUploadFiles = useCallback(
    (files: DialUploadFileItem[], destinationFolder: string) => {
      const source = resolveSourceByPath(destinationFolder, labels);
      if (source != null) sources[source].onUploadFiles(files, destinationFolder);
    },
    [labels, sources],
  );

  const onValidateUpload = useCallback(
    (files: DialUploadFileItem[], existingFiles: DialFile[], destinationFolder: string) =>
      sources[resolveSourceByPath(destinationFolder, labels) ?? DialFileManagerTabs.MyFiles]
        .onValidateUpload(files, existingFiles, destinationFolder),
    [labels, sources],
  );

  const cancelUpload = useCallback(() => {
    SOURCE_TABS.forEach((tab) => sources[tab].cancelUpload());
  }, [sources]);

  const clearUploadBatch = useCallback(() => {
    SOURCE_TABS.forEach((tab) => sources[tab].clearUploadBatch());
  }, [sources]);

  const onCreateFolder = useCallback(
    async (file: DialUploadFileItem, folderPath: string, fileId: string) => {
      const source = resolveSourceByPath(folderPath, labels);
      if (source != null) await sources[source].onCreateFolder(file, folderPath, fileId);
    },
    [labels, sources],
  );

  const onCreateFolderValidate = useCallback(
    (name: string, parentFolder: DialFile) =>
      sources[
        resolveSourceByPath(parentFolder.path, labels) ?? DialFileManagerTabs.MyFiles
      ].onCreateFolderValidate(name, parentFolder),
    [labels, sources],
  );

  const onRenameValidate = useCallback(
    (value: string, item: DialFile) =>
      sources[resolveSourceByPath(item.path, labels) ?? DialFileManagerTabs.MyFiles]
        .onRenameValidate(value, item),
    [labels, sources],
  );

  const onDownloadFiles = useCallback(
    (files: DialFile[]) => {
      groupBySource(files, (file) => file.path, labels).forEach((group, source) =>
        sources[source].onDownloadFiles(group),
      );
    },
    [labels, sources],
  );

  const onDeleteFiles = useCallback(
    (items: DialDeletedItem[], sourceFolder: string) => {
      groupBySource(items, (item) => item.sourceUrl, labels).forEach((group, source) =>
        sources[source].onDeleteFiles(group, sourceFolder),
      );
    },
    [labels, sources],
  );

  const onMoveToFiles = useCallback(
    (items: DialCopiedItem[], sourceFolder: string, destinationFolder: string) => {
      const destination = resolveSourceByPath(destinationFolder, labels);
      const isSameSource =
        destination != null &&
        items.every((item) => resolveSourceByPath(item.sourceUrl, labels) === destination);
      if (!isSameSource) {
        notifyCrossSource();
        return;
      }
      sources[destination].onMoveToFiles(items, sourceFolder, destinationFolder);
    },
    [labels, sources, notifyCrossSource],
  );

  const all = useMemo((): UseDialFileManagerResult => {
    const current = sources[owner ?? DialFileManagerTabs.MyFiles];
    const hasOwner = owner != null;
    const errors = enabledSources.map((tab) => sources[tab].error);
    return {
      items: SOURCE_TABS.map((tab) => sources[tab].items[0]),
      isLoading: enabledSources.some((tab) => sources[tab].isLoading),
      error: errors.length > 0 && errors.every((error) => error != null) ? errors[0] : null,
      path: allPath,
      onPathChange,
      retry,
      onUploadFiles,
      onValidateUpload,
      uploadBatchState: SOURCE_TABS.map((tab) => sources[tab].uploadBatchState).find(Boolean) ?? null,
      cancelUpload,
      clearUploadBatch,
      onCreateFolder,
      onCreateFolderValidate,
      isCreatingFolder: SOURCE_TABS.some((tab) => sources[tab].isCreatingFolder),
      onDownloadFiles,
      isDownloading: SOURCE_TABS.some((tab) => sources[tab].isDownloading),
      onDeleteFiles,
      isDeleting: SOURCE_TABS.some((tab) => sources[tab].isDeleting),
      onRenameValidate,
      onMoveToFiles,
      isRenaming: SOURCE_TABS.some((tab) => sources[tab].isRenaming),
      uploadEnabled: hasOwner && current.uploadEnabled,
      isNewButtonDisabled: !hasOwner || current.isNewButtonDisabled,
      disabledNewButtonTooltip: hasOwner
        ? current.disabledNewButtonTooltip
        : t(DialFileManagerI18nKeys.AddDisabledAtAllRoot),
      visibleColumns: current.visibleColumns,
      dateLocale: current.dateLocale,
      dateOptions: current.dateOptions,
      actionLabels: current.actionLabels,
      sharedWithMeIds: sharedWithMe.sharedWithMeIds,
    };
  }, [
    sources,
    owner,
    enabledSources,
    allPath,
    onPathChange,
    retry,
    onUploadFiles,
    onValidateUpload,
    cancelUpload,
    clearUploadBatch,
    onCreateFolder,
    onCreateFolderValidate,
    onDownloadFiles,
    onDeleteFiles,
    onRenameValidate,
    onMoveToFiles,
    sharedWithMe.sharedWithMeIds,
    t,
  ]);

  if (isAll) return all;
  return sources[activeTab as DialFileSourceTab] ?? myFiles;
};
