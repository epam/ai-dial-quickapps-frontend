import { RadioGroup } from '@epam/ai-dial-ui-kit';
import { FC, useCallback, useMemo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';

export interface AgentSettingsTabProps {
  agentId: string;
  /** The transport saved for this entry; none reads as MCP, which is what save writes. */
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
  const { t } = useTranslation(Translation.QuickAppEditor);

  const transportItems = useMemo(
    () => [
      { value: DialAppTransportType.MCP, label: t(QuickAppEditorI18nKeys.MCP) },
      {
        value: DialAppTransportType.ChatCompletion,
        label: t(QuickAppEditorI18nKeys.ChatCompletion),
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
      labelProps={{ label: t(QuickAppEditorI18nKeys.ConnectVia) }}
      items={transportItems}
      value={transport ?? DialAppTransportType.MCP}
      onChange={handleTransportChange}
      disabled={isTransportDisabled}
    />
  );
};
