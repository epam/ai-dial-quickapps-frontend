import { RadioGroup } from '@epam/ai-dial-ui-kit';
import { FC, useCallback, useMemo } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { DEFAULT_AGENT_TRANSPORT } from '@/constants/quick-apps';
import { useTranslation } from 'react-i18next';
import { DialAppTransportType } from '@/types/quick-apps';

export interface AgentSettingsTabProps {
  agentId: string;
  /** The transport saved for this entry; none reads as `DEFAULT_AGENT_TRANSPORT`, which is what save writes. */
  transport?: DialAppTransportType;
  isTransportDisabled: boolean;
  onTransportChange: (transport: DialAppTransportType) => void;
}

/**
 * An agent's per-app settings, in its details popup's Settings tab: how the
 * orchestrator calls it (Connect via). A change applies to the form at once.
 */
export const AgentSettingsTab: FC<AgentSettingsTabProps> = ({
  agentId,
  transport,
  isTransportDisabled,
  onTransportChange,
}) => {
  const { t } = useTranslation();

  const transportItems = useMemo(
    () => [
      { value: DialAppTransportType.MCP, label: t(ApplicationEditorI18nKeys.AgentsTransportMcp) },
      {
        value: DialAppTransportType.ChatCompletion,
        label: t(ApplicationEditorI18nKeys.AgentsTransportChatCompletion),
      },
    ],
    [t],
  );

  const handleTransportChange = useCallback(
    (value: string) => onTransportChange(value as DialAppTransportType),
    [onTransportChange],
  );

  return (
    <RadioGroup
      name={`transport-${agentId}`}
      labelProps={{ label: t(ApplicationEditorI18nKeys.AgentsConnectVia) }}
      items={transportItems}
      value={transport ?? DEFAULT_AGENT_TRANSPORT}
      onChange={handleTransportChange}
      disabled={isTransportDisabled}
    />
  );
};
