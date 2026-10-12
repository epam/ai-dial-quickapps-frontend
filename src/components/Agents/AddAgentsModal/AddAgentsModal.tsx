import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { FC, useMemo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';
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
  const { t, language } = useTranslation(Translation.QuickAppEditor);
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
      title: t(QuickAppEditorI18nKeys.AddAgent),
      catalog: t(QuickAppEditorI18nKeys.AgentsCatalog),
      search: t(QuickAppEditorI18nKeys.SearchAgents),
      loading: t(QuickAppEditorI18nKeys.LoadingAgents),
      failedToLoad: t(QuickAppEditorI18nKeys.FailedToLoadAgents),
      empty: t(QuickAppEditorI18nKeys.NoAgentsAvailable),
      selectAll: t(QuickAppEditorI18nKeys.SelectAllAgents),
      selectRow: (name) => t(QuickAppEditorI18nKeys.SelectAddOn, { name }),
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
