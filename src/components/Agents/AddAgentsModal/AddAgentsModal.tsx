import { AddOnCatalogModal, type AddOnCatalogModalLabels } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { FC, useMemo } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useCatalogPickerSharedProps } from '@/hooks/use-catalog-picker-shared-props';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useTranslation } from 'react-i18next';
import { getEntityIdWithoutVersion, isHiddenDialFolderId } from '@/utils/api';
import { ADD_ON_LIST_PROPS } from '@/constants/catalog-picker';
import { mapAgentToCatalogItem } from '@/utils/map-agent-to-catalog-item';

export interface AddAgentsModalProps {
  /** Every `addOns` id; the attached agents are checked when the popup opens, toolset ids stay in place on Add. */
  allIds: string[];
  /** Entries attached in the Toolsets row: listed unchecked; checking one switches it to an agent. */
  otherRowIds?: string[];
  onConfirm: (allIds: string[]) => void;
  onClose: () => void;
}

/**
 * Agent picker: models and applications with a chat interface, with multi-selection.
 * MCP-only applications are toolsets, as in the DIAL Chat catalog.
 */
export const AddAgentsModal: FC<AddAgentsModalProps> = ({
  allIds,
  otherRowIds = [],
  onConfirm,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { app } = useAppContext();
  const { models, userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();
  const { labels: sharedLabels, ...loadState } = useCatalogPickerSharedProps();
  // The app being edited must not be selectable as its own agent — that
  // would make it call itself (recursion).
  const currentAppEntityId = getEntityIdWithoutVersion(app.id);

  // Entries of the other row are listed unchecked: attached, but not as this row.
  const attachedIds = useMemo(
    () => allIds.filter((id) => !otherRowIds.includes(id)),
    [allIds, otherRowIds],
  );

  const items = useMemo(
    () =>
      models
        .filter((agent) => !isHiddenDialFolderId(agent.id))
        .filter((agent) => getEntityIdWithoutVersion(agent.id) !== currentAppEntityId)
        .map((agent) => mapAgentToCatalogItem(agent, { language, userBucket, scopeLabels })),
    [models, currentAppEntityId, language, userBucket, scopeLabels],
  );

  const labels = useMemo<AddOnCatalogModalLabels>(
    () => ({
      ...sharedLabels,
      title: t(ApplicationEditorI18nKeys.AgentsAdd),
      catalog: t(ApplicationEditorI18nKeys.AgentsCatalogTitle),
      search: t(ApplicationEditorI18nKeys.AgentsSearchPlaceholder),
      loading: t(ApplicationEditorI18nKeys.AgentsLoading),
      failedToLoad: t(ApplicationEditorI18nKeys.AgentsLoadError),
      empty: t(ApplicationEditorI18nKeys.AgentsEmpty),
      selectAll: t(ApplicationEditorI18nKeys.AgentsSelectAll),
      selectRow: (name) => t(ApplicationEditorI18nKeys.AddOnsSelect, { name }),
    }),
    [t, sharedLabels],
  );

  return (
    <AddOnCatalogModal
      type={CatalogEntityType.Agent}
      items={items}
      attachedIds={attachedIds}
      labels={labels}
      {...loadState}
      listProps={ADD_ON_LIST_PROPS}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};
