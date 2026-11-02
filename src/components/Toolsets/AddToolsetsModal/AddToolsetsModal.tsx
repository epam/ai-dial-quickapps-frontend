import { AddOnCatalogModal, type AddOnCatalogModalLabels } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { FC, useMemo } from 'react';

import { ApplicationEditorI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import { useDataContext } from '@/context/DataContext';
import { useCatalogPickerSharedProps } from '@/hooks/use-catalog-picker-shared-props';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useTranslation } from 'react-i18next';
import { isHiddenDialFolderId } from '@/utils/api';
import { ADD_ON_LIST_PROPS } from '@/constants/catalog-picker';
import { mapToolsetToCatalogItem } from '@/utils/map-toolset-to-catalog-item';

export interface AddToolsetsModalProps {
  /** Every `addOns` id; the attached toolsets are checked when the popup opens, agent ids stay in place on Add. */
  allIds: string[];
  onConfirm: (allIds: string[]) => void;
  onClose: () => void;
}

/** Toolset picker: the toolsets catalog with multi-selection. */
export const AddToolsetsModal: FC<AddToolsetsModalProps> = ({ allIds, onConfirm, onClose }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { toolsets, userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();
  const { labels: sharedLabels, ...loadState } = useCatalogPickerSharedProps();

  const items = useMemo(
    () =>
      toolsets
        .filter((toolset) => !isHiddenDialFolderId(toolset.id))
        .map((toolset) => mapToolsetToCatalogItem(toolset, { language, userBucket, scopeLabels })),
    [toolsets, language, userBucket, scopeLabels],
  );

  const labels = useMemo<AddOnCatalogModalLabels>(
    () => ({
      ...sharedLabels,
      title: t(ApplicationEditorI18nKeys.ToolsetsAdd),
      catalog: t(ApplicationEditorI18nKeys.ToolsetsCatalogTitle),
      search: t(ApplicationEditorI18nKeys.ToolsetsSearchPlaceholder),
      loading: t(ApplicationEditorI18nKeys.ToolsetsLoading),
      failedToLoad: t(ApplicationEditorI18nKeys.ToolsetsLoadError),
      empty: t(ApplicationEditorI18nKeys.ToolsetsEmpty),
      selectAll: t(ApplicationEditorI18nKeys.ToolsetsSelectAll),
      selectRow: (name) => t(ApplicationEditorI18nKeys.AddOnsSelect, { name }),
    }),
    [t, sharedLabels],
  );

  return (
    <AddOnCatalogModal
      type={CatalogEntityType.Toolset}
      items={items}
      attachedIds={allIds}
      labels={labels}
      {...loadState}
      listProps={{
        ...ADD_ON_LIST_PROPS,
        credentialsBadgeLoggedOutLabel: t(CatalogI18nKeys.CredentialsBadgeLoggedOut),
      }}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};
