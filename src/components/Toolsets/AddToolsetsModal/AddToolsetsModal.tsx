import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { FC, useMemo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';
import { isHiddenDialFolderId } from '@/utils/api';
import { mapToolsetToCatalogItem } from '@/utils/map-toolset-to-catalog-item';

import {
  AddOnCatalogModal,
  type AddOnCatalogModalLabels,
} from '@/components/common/AddOnCatalogModal/AddOnCatalogModal';

export interface AddToolsetsModalProps {
  /** Every `addOns` id; agent ids stay in place on Add. */
  allIds: string[];
  /** The attached toolset ids; checked when the popup opens. */
  toolsetIds: string[];
  onConfirm: (allIds: string[]) => void;
  onClose: () => void;
}

/** Toolset picker: the toolsets catalog with multi-selection. */
export const AddToolsetsModal: FC<AddToolsetsModalProps> = ({
  allIds,
  toolsetIds,
  onConfirm,
  onClose,
}) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);
  const { toolsets, userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();

  const items = useMemo(
    () =>
      toolsets
        .filter((toolset) => !isHiddenDialFolderId(toolset.id))
        .map((toolset) => mapToolsetToCatalogItem(toolset, { language, userBucket, scopeLabels })),
    [toolsets, language, userBucket, scopeLabels],
  );

  const labels = useMemo<AddOnCatalogModalLabels>(
    () => ({
      title: t(QuickAppEditorI18nKeys.AddToolset),
      catalog: t(QuickAppEditorI18nKeys.ToolsetsCatalog),
      search: t(QuickAppEditorI18nKeys.SearchToolsets),
      loading: t(QuickAppEditorI18nKeys.LoadingToolsets),
      failedToLoad: t(QuickAppEditorI18nKeys.FailedToLoadToolsets),
      empty: t(QuickAppEditorI18nKeys.NoToolsetsAvailable),
      selectAll: t(QuickAppEditorI18nKeys.SelectAllToolsets),
      selectRow: (name) => t(QuickAppEditorI18nKeys.SelectSkill, { name }),
      credentialsBadge: t(QuickAppEditorI18nKeys.ToolsetLoggedOutBadge),
    }),
    [t],
  );

  return (
    <AddOnCatalogModal
      type={CatalogEntityType.Toolset}
      items={items}
      attachedIds={allIds}
      initialCheckedIds={toolsetIds}
      labels={labels}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};
