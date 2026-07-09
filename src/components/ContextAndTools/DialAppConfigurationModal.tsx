'use client';
import { FC, useState } from 'react';

import { ModelIcon } from '@/components/common/ModelIcon/ModelIcon';
import { MarketplaceI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import { DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';
import { DialPopup, DialPrimaryButton, DialRadioButton, PopupSize } from '@epam/ai-dial-ui-kit';

interface DialAppConfigurationModalProps {
  agentId: string;
  transport?: DialAppTransportType;
  onClose: () => void;
  onSave: (transport: DialAppTransportType) => void;
}

export const DialAppConfigurationModal: FC<DialAppConfigurationModalProps> = ({
  agentId,
  transport,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { modelsMap } = useDataContext();
  const agent = modelsMap[agentId];

  const doesSupportChatCompletion = agent?.type === 'model';

  const [selectedTransport, setSelectedTransport] = useState<DialAppTransportType>(
    transport ??
      (doesSupportChatCompletion ? DialAppTransportType.ChatCompletion : DialAppTransportType.MCP),
  );

  const handleApply = () => {
    onSave(selectedTransport);
    onClose();
  };

  return (
    <DialPopup
      open
      header={t(MarketplaceI18nKeys.AdvancedSettings)}
      size={PopupSize.Sm}
      onClose={onClose}
      footer={
        <div className="flex justify-end px-6 py-4">
          <DialPrimaryButton label={t(MarketplaceI18nKeys.ApplyChanges)} onClick={handleApply} />
        </div>
      }
    >
      <div className="flex flex-col divide-y divide-tertiary">
        {agent && (
          <div className="flex items-center gap-3 px-6 py-4">
            <ModelIcon name={agent.name} iconUrl={agent.iconUrl} size={40} radius={10} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="dial-small-semi-text truncate text-primary">{agent.name}</span>
              {agent.version && (
                <span className="dial-tiny-text truncate text-secondary">{agent.version}</span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 px-6 py-4">
          <span className="dial-tiny-text text-secondary">{t(MarketplaceI18nKeys.ConnectVia)}</span>
          <DialRadioButton
            name="transport"
            value={DialAppTransportType.MCP}
            inputId={DialAppTransportType.MCP}
            label={t(MarketplaceI18nKeys.MCP)}
            checked={selectedTransport === DialAppTransportType.MCP}
            onChange={(v) => setSelectedTransport(v as DialAppTransportType)}
          />
          <DialRadioButton
            name="transport"
            value={DialAppTransportType.ChatCompletion}
            inputId={DialAppTransportType.ChatCompletion}
            label={t(MarketplaceI18nKeys.ChatCompletion)}
            checked={selectedTransport === DialAppTransportType.ChatCompletion}
            disabled={!doesSupportChatCompletion}
            onChange={(v) => setSelectedTransport(v as DialAppTransportType)}
          />
        </div>
      </div>
    </DialPopup>
  );
};
