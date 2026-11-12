import { AddOnCatalogModal, type AddOnCatalogModalLabels } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { FC, useMemo } from 'react';

import { ApplicationEditorI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useCatalogPickerSharedProps } from '@/hooks/use-catalog-picker-shared-props';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useTranslation } from 'react-i18next';
import { getEntityIdWithoutVersion, isHiddenDialFolderId } from '@/utils/api';
import { ADD_ON_LIST_PROPS } from '@/constants/catalog-picker';
import { DialEntityType } from '@/types/dial-entities';
import { doesAgentSupportMcp } from '@/utils/application';
import { mapAgentToCatalogItem } from '@/utils/map-agent-to-catalog-item';
import { mapToolsetToCatalogItem } from '@/utils/map-toolset-to-catalog-item';

export interface AddToolsetsModalProps {
  /** Every `addOns` id; the attached toolsets are checked when the popup opens, agent ids stay in place on Add. */
  allIds: string[];
  /** Entries attached in the Agents row: listed unchecked; checking one switches it to a tool. */
  otherRowIds?: string[];
  onConfirm: (allIds: string[]) => void;
  onClose: () => void;
}

/**
 * Toolset picker: the toolsets catalog and the agents exposing an MCP interface
 * (listed under Toolsets in the DIAL Chat catalog too), with multi-selection.
 */
export const AddToolsetsModal: FC<AddToolsetsModalProps> = ({
  allIds,
  otherRowIds = [],
  onConfirm,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { app } = useAppContext();
  const { toolsets, models, mcpAgents, userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();
  const { labels: sharedLabels, ...loadState } = useCatalogPickerSharedProps();

  // The app being edited must not be selectable as its own tool (recursion).
  const currentAppEntityId = getEntityIdWithoutVersion(app.id);

  // Entries of the other row are listed unchecked: attached, but not as this row.
  const attachedIds = useMemo(
    () => allIds.filter((id) => !otherRowIds.includes(id)),
    [allIds, otherRowIds],
  );

  const items = useMemo(() => {
    // MCP-only applications (`mcpAgents`) and applications that also serve chat
    // are both listed under Toolsets, as in the DIAL Chat catalog.
    const mcpApplications = [
      ...mcpAgents,
      ...models.filter(
        (model) => model.type === DialEntityType.Application && doesAgentSupportMcp(model),
      ),
    ]
      .filter((agent) => !isHiddenDialFolderId(agent.id))
      .filter((agent) => getEntityIdWithoutVersion(agent.id) !== currentAppEntityId)
      .map((agent) => ({
        ...mapAgentToCatalogItem(agent, { language, userBucket, scopeLabels }),
        type: CatalogEntityType.Toolset,
      }));

    return [
      ...toolsets
        .filter((toolset) => !isHiddenDialFolderId(toolset.id))
        .map((toolset) => mapToolsetToCatalogItem(toolset, { language, userBucket, scopeLabels })),
      ...mcpApplications,
    ];
  }, [toolsets, models, mcpAgents, currentAppEntityId, language, userBucket, scopeLabels]);

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
      attachedIds={attachedIds}
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
