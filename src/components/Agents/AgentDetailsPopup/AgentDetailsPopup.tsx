import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { DIAL_ICON_SIZE, DIAL_KIT_ICON_STROKE, GhostButton } from '@epam/ai-dial-ui-kit';
import { IconKey } from '@tabler/icons-react';
import { FC, useCallback, useMemo } from 'react';

import {
  ApplicationCredentialsI18nKeys,
  ApplicationEditorI18nKeys,
  BasicI18nKeys,
  ButtonsI18nKeys,
} from '@/constants/translation-keys';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useApplicationAuthentication } from '@/hooks/use-application-authentication';
import { useEntityDetails } from '@/hooks/use-entity-details';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useSearchParams } from '@/hooks/use-search-params';
import { useTranslation } from 'react-i18next';
import type { DialModel } from '@/types/dial-entities';
import { DialEntityType } from '@/types/dial-entities';
import { type AddOnAppTab, AppDetailsTab } from '@/types/entity-details';
import type { DialAppTransportType } from '@/types/quick-apps';
import { getCatalogFolder } from '@/utils/entity-scope';
import { getAddOnDisplay } from '@/utils/get-add-on-display';
import { canChooseAgentTransport, mapAgentToCatalogItem } from '@/utils/map-agent-to-catalog-item';
import { getModelScopeInfo } from '@/utils/map-model-to-catalog-item';
import { requestApplicationCredentials } from '@/utils/request-application-credentials';

import { AgentSettingsTab } from '@/components/Agents/AgentSettingsTab/AgentSettingsTab';
import { AddOnDetailsPopup } from '@/components/common/AddOnDetailsPopup/AddOnDetailsPopup';

export interface AgentDetailsPopupProps {
  agentId: string;
  /** Undefined when the attached agent is no longer in the catalog. */
  agent?: DialModel;
  /** The transport saved for this entry, if any. */
  transport?: DialAppTransportType;
  onRemove: (id: string) => void;
  onConfigure: (id: string, transport: DialAppTransportType) => void;
  onClose: () => void;
}

/**
 * An agent's (application, MCP agent or model) details — the catalog's About,
 * Overview and, for models, Pricing and Limits — plus this app's Settings tab
 * (Connect via), a Credentials action that hands over to the host's forms,
 * and Delete, which detaches the agent from this application (the agent is
 * untouched).
 */
export const AgentDetailsPopup: FC<AgentDetailsPopupProps> = ({
  agentId,
  agent,
  transport,
  onRemove,
  onConfigure,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { settings } = useAppContext();
  const { userBucket, modelsMap } = useDataContext();
  const searchParams = useSearchParams();
  const scopeLabels = useScopeLabels();

  const { name, version, iconUrl } = getAddOnDisplay(agentId, agent, language);
  const isModel = agent?.type === DialEntityType.Model;
  const isEditable = agent != null;
  const isTransportVisible = canChooseAgentTransport(agent, modelsMap);
  // Same gate as before the redesign: the host advertises credential forms
  // with `applicationCredentials=true`, and only apps behind auth need them.
  const isCredentialsMode = searchParams.get('applicationCredentials') === 'true';
  const isAuthenticationRequired = useApplicationAuthentication(
    isEditable && isCredentialsMode && agent?.type === DialEntityType.Application
      ? agentId
      : undefined,
  );

  const folder = useMemo(
    () => getCatalogFolder(getModelScopeInfo(agentId, userBucket), scopeLabels),
    [agentId, userBucket, scopeLabels],
  );

  const listingItem = useMemo(
    () =>
      agent == null
        ? undefined
        : mapAgentToCatalogItem(agent, { language, userBucket, scopeLabels }),
    [agent, language, userBucket, scopeLabels],
  );
  const { status, details, retry } = useEntityDetails(listingItem);
  const item = useMemo(
    () => (listingItem == null ? undefined : { ...listingItem, details }),
    [listingItem, details],
  );

  const handleDelete = useCallback(() => {
    onRemove(agentId);
    onClose();
  }, [onRemove, onClose, agentId]);

  const handleTransportChange = useCallback(
    (nextTransport: DialAppTransportType) => onConfigure(agentId, nextTransport),
    [onConfigure, agentId],
  );

  // The host shows its own credential forms; ours closes so they are not stacked.
  const handleRequestCredentials = useCallback(() => {
    onClose();
    requestApplicationCredentials(agentId, settings.allowedOrigins);
  }, [onClose, agentId, settings.allowedOrigins]);

  // Settings holds the transport choice, so it shows only when there is one.
  const appTabs = useMemo((): AddOnAppTab[] | undefined => {
    if (!isTransportVisible) return undefined;
    return [
      {
        id: AppDetailsTab.Settings,
        label: t(BasicI18nKeys.Settings),
        content: (
          <AgentSettingsTab
            agentId={agentId}
            transport={transport}
            onTransportChange={handleTransportChange}
          />
        ),
      },
    ];
  }, [t, agentId, transport, isTransportVisible, handleTransportChange]);

  const actions = isAuthenticationRequired && (
    <GhostButton
      label={t(ApplicationCredentialsI18nKeys.Title)}
      iconBefore={<IconKey size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
      onClick={handleRequestCredentials}
    />
  );

  return (
    <AddOnDetailsPopup
      entityType={isModel ? CatalogEntityType.Model : CatalogEntityType.Agent}
      name={name}
      version={version}
      iconUrl={iconUrl}
      folder={folder}
      actions={actions || undefined}
      item={item}
      appTabs={appTabs}
      detailsStatus={status}
      onRetry={retry}
      unavailableText={agent == null ? t(ApplicationEditorI18nKeys.AgentsUnavailable) : undefined}
      deleteLabel={t(ButtonsI18nKeys.Delete)}
      onDelete={handleDelete}
      onClose={onClose}
    />
  );
};
