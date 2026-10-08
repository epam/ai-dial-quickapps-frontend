import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { DIAL_ICON_SIZE, DIAL_KIT_ICON_STROKE, GhostButton } from '@epam/ai-dial-ui-kit';
import { IconKey, IconSettings } from '@tabler/icons-react';
import { FC, useCallback, useMemo, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useApplicationAuthentication } from '@/hooks/use-application-authentication';
import { useEntityDetails } from '@/hooks/use-entity-details';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useSearchParams } from '@/hooks/use-search-params';
import { useTranslation } from '@/hooks/use-translation';
import type { DialModel } from '@/types/dial-entities';
import { DialEntityType } from '@/types/dial-entities';
import type { DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';
import { getCatalogFolder } from '@/utils/entity-scope';
import { getAddOnDisplay } from '@/utils/get-add-on-display';
import {
  canConfigureAgentTransport,
  mapAgentToCatalogItem,
} from '@/utils/map-agent-to-catalog-item';
import { getModelScopeInfo } from '@/utils/map-model-to-catalog-item';
import { requestApplicationCredentials } from '@/utils/request-application-credentials';

import { DialAppConfigurationModal } from '@/components/Agents/DialAppConfigurationModal/DialAppConfigurationModal';
import { AddOnDetailsPopup } from '@/components/common/AddOnDetailsPopup/AddOnDetailsPopup';

export interface AgentDetailsPopupProps {
  agentId: string;
  /** Undefined when the attached agent is no longer in the catalog. */
  agent?: DialModel;
  /** The transport saved for this entry, if any. */
  transport?: DialAppTransportType;
  isReadonly: boolean;
  onRemove: (id: string) => void;
  onConfigure: (id: string, transport: DialAppTransportType) => void;
  onClose: () => void;
}

/**
 * An agent's (application, MCP agent or model) details — the catalog's About,
 * Overview and, for models, Pricing and Limits — plus Connection (transport)
 * and Credentials for applications, and Delete,
 * which detaches the agent from this application (the agent is untouched).
 */
export const AgentDetailsPopup: FC<AgentDetailsPopupProps> = ({
  agentId,
  agent,
  transport,
  isReadonly,
  onRemove,
  onConfigure,
  onClose,
}) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { settings } = useAppContext();
  const { userBucket } = useDataContext();
  const searchParams = useSearchParams();
  const scopeLabels = useScopeLabels();
  const [isConfiguring, setIsConfiguring] = useState(false);

  const { name, version, iconUrl } = getAddOnDisplay(agentId, agent, language);
  const isModel = agent?.type === DialEntityType.Model;
  const isEditable = !isReadonly && agent != null;
  const canConfigure = isEditable && canConfigureAgentTransport(agent);
  // Same gate as before the redesign: the host advertises credential forms
  // with `applicationCredentials=true`, and only apps behind auth need them.
  const isCredentialsMode = searchParams.get('applicationCredentials') === 'true';
  const needsAuthentication = useApplicationAuthentication(
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

  const handleConfigureSave = useCallback(
    (nextTransport: DialAppTransportType) => onConfigure(agentId, nextTransport),
    [onConfigure, agentId],
  );

  const actions = (canConfigure || needsAuthentication) && (
    <>
      {canConfigure && (
        <GhostButton
          label={t(QuickAppEditorI18nKeys.AgentConnection)}
          iconBefore={<IconSettings size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
          onClick={() => setIsConfiguring(true)}
        />
      )}
      {needsAuthentication && (
        <GhostButton
          label={t(QuickAppEditorI18nKeys.ApplicationCredentials)}
          iconBefore={<IconKey size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
          onClick={() => requestApplicationCredentials(agentId, settings.allowedOrigins)}
        />
      )}
    </>
  );

  return (
    <>
      <AddOnDetailsPopup
        entityType={isModel ? CatalogEntityType.Model : CatalogEntityType.Agent}
        name={name}
        version={version}
        iconUrl={iconUrl}
        folder={folder}
        actions={actions || undefined}
        item={item}
        detailsStatus={status}
        onRetry={retry}
        unavailableText={agent == null ? t(QuickAppEditorI18nKeys.AgentUnavailable) : undefined}
        isReadonly={isReadonly}
        deleteLabel={t(QuickAppEditorI18nKeys.RemoveSkillFromApp)}
        onDelete={handleDelete}
        onClose={onClose}
      />
      {isConfiguring && (
        <DialAppConfigurationModal
          agentId={agentId}
          transport={transport}
          onSave={handleConfigureSave}
          onClose={() => setIsConfiguring(false)}
        />
      )}
    </>
  );
};
