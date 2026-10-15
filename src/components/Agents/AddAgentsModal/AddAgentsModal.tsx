import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { FC, useMemo } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useTranslation } from 'react-i18next';
import { getEntityIdWithoutVersion, isHiddenDialFolderId } from '@/utils/api';
import { mapAgentToCatalogItem } from '@/utils/map-agent-to-catalog-item';

import {
  AddOnCatalogModal,
  type AddOnCatalogModalLabels,
} from '@/components/common/AddOnCatalogModal/AddOnCatalogModal';

export interface AddAgentsModalProps {
  /** Every `addOns` id; toolset ids stay in place on Add. */
  allIds: string[];
  /** The attached agent ids; checked when the popup opens. */
  agentIds: string[];
  onConfirm: (allIds: string[]) => void;
  onClose: () => void;
}

/** Agent picker: applications, MCP agents and models, with multi-selection. */
export const AddAgentsModal: FC<AddAgentsModalProps> = ({
  allIds,
  agentIds,
  onConfirm,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { app } = useAppContext();
  const { models, mcpAgents, userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();
  // The app being edited must not be selectable as its own agent — that
  // would make it call itself (recursion).
  const currentAppEntityId = getEntityIdWithoutVersion(app.id);

  const items = useMemo(
    () =>
      [...models, ...mcpAgents]
        .filter((agent) => !isHiddenDialFolderId(agent.id))
        .filter((agent) => getEntityIdWithoutVersion(agent.id) !== currentAppEntityId)
        .map((agent) => mapAgentToCatalogItem(agent, { language, userBucket, scopeLabels })),
    [models, mcpAgents, currentAppEntityId, language, userBucket, scopeLabels],
  );

  const labels = useMemo<AddOnCatalogModalLabels>(
    () => ({
      title: t(ApplicationEditorI18nKeys.AgentsAdd),
      catalog: t(ApplicationEditorI18nKeys.AgentsCatalogTitle),
      search: t(ApplicationEditorI18nKeys.AgentsSearchPlaceholder),
      loading: t(ApplicationEditorI18nKeys.AgentsLoading),
      failedToLoad: t(ApplicationEditorI18nKeys.AgentsLoadError),
      empty: t(ApplicationEditorI18nKeys.AgentsEmpty),
      selectAll: t(ApplicationEditorI18nKeys.AgentsSelectAll),
      selectRow: (name) => t(ApplicationEditorI18nKeys.AddOnsSelect, { name }),
    }),
    [t],
  );

  return (
    <AddOnCatalogModal
      type={CatalogEntityType.Agent}
      items={items}
      attachedIds={allIds}
      initialCheckedIds={agentIds}
      labels={labels}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};
