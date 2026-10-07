import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  EntityType,
  GhostButton,
  NoDataContent,
} from '@epam/ai-dial-ui-kit';
import { IconKey, IconSettings } from '@tabler/icons-react';
import { FC, useCallback, useMemo, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useApplicationAuthentication } from '@/hooks/use-application-authentication';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useSearchParams } from '@/hooks/use-search-params';
import { useTranslation } from '@/hooks/use-translation';
import { AddOnDetailsTabId } from '@/types/add-on-details';
import type { DialModel } from '@/types/dial-entities';
import type { DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';
import { getCatalogFolder } from '@/utils/entity-scope';
import { getAddOnDisplay } from '@/utils/get-add-on-display';
import { getEntityStatus, getEntityStatusMessage } from '@/utils/get-entity-status';
import {
  canConfigureAgentTransport,
  getAgentOverviewRows,
} from '@/utils/map-agent-to-catalog-item';
import { getModelScopeInfo } from '@/utils/map-model-to-catalog-item';
import { requestApplicationCredentials } from '@/utils/request-application-credentials';

import { DialAppConfigurationModal } from '@/components/Agents/DialAppConfigurationModal/DialAppConfigurationModal';
import { AddOnDetailsPopup } from '@/components/common/AddOnDetailsPopup/AddOnDetailsPopup';
import { EntityAboutTab } from '@/components/common/EntityAboutTab/EntityAboutTab';
import { OverviewList } from '@/components/common/OverviewList/OverviewList';

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
 * An agent's (application, MCP agent or model) details: About and Overview,
 * plus Connection (transport) and Credentials for applications, and Delete,
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
  const isModel = agent?.type === 'model';
  const isEditable = !isReadonly && agent != null;
  const canConfigure = isEditable && canConfigureAgentTransport(agent);
  // Same gate as before the redesign: the host advertises credential forms
  // with `applicationCredentials=true`, and only apps behind auth need them.
  const isCredentialsMode = searchParams.get('applicationCredentials') === 'true';
  const needsAuthentication = useApplicationAuthentication(
    isEditable && isCredentialsMode && agent?.type === 'application' ? agentId : undefined,
  );

  const folder = useMemo(
    () => getCatalogFolder(getModelScopeInfo(agentId, userBucket), scopeLabels),
    [agentId, userBucket, scopeLabels],
  );

  const overviewRows = useMemo(
    () =>
      agent == null
        ? []
        : getAgentOverviewRows(agent, {
            language,
            userBucket,
            scopeLabels,
            transport,
            labels: {
              folder: t(QuickAppEditorI18nKeys.SkillFolder),
              updated: t(QuickAppEditorI18nKeys.SkillUpdated),
              version: t(QuickAppEditorI18nKeys.SkillVersion),
              connection: t(QuickAppEditorI18nKeys.AgentConnection),
              mcp: t(QuickAppEditorI18nKeys.MCP),
              chatCompletion: t(QuickAppEditorI18nKeys.ChatCompletion),
            },
          }),
    [agent, language, userBucket, scopeLabels, transport, t],
  );

  const banner =
    agent == null
      ? undefined
      : getEntityStatusMessage(
          getEntityStatus(agent, agentId),
          true,
          tCommon,
          tCommon(CommonI18nKeys.AgentEntityType),
        );

  const handleDelete = useCallback(() => {
    onRemove(agentId);
    onClose();
  }, [onRemove, onClose, agentId]);

  const handleConfigureSave = useCallback(
    (nextTransport: DialAppTransportType) => onConfigure(agentId, nextTransport),
    [onConfigure, agentId],
  );

  const unavailable = <NoDataContent title={t(QuickAppEditorI18nKeys.AgentUnavailable)} />;

  const tabs = [
    {
      id: AddOnDetailsTabId.About,
      label: t(QuickAppEditorI18nKeys.AboutTab),
      panel: agent ? (
        <EntityAboutTab description={agent.description} topics={agent.topics} />
      ) : (
        unavailable
      ),
    },
    {
      id: AddOnDetailsTabId.Overview,
      label: t(QuickAppEditorI18nKeys.SkillOverviewTab),
      panel: agent ? <OverviewList rows={overviewRows} /> : unavailable,
    },
  ];

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
        entityType={isModel ? EntityType.Model : EntityType.Agent}
        typeLabel={t(
          isModel ? QuickAppEditorI18nKeys.Model : QuickAppEditorI18nKeys.AgentTypeLabel,
        )}
        name={name}
        version={version}
        iconUrl={iconUrl}
        folder={folder}
        actions={actions || undefined}
        banner={banner}
        tabs={tabs}
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
