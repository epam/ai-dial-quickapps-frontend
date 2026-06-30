"use client";
import { FC, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Translation } from "@/types/translation";
import { MarketplaceI18nKeys } from "@/constants/i18n";
import { useDataContext } from "@/context/DataContext";
import { DialAppTransportType } from "@/types/quick-apps";
import { doesAgentSupportMcp } from "@/utils/application";
import { ButtonVariant, DialButton } from "@epam/ai-dial-ui-kit";

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
  const supportsMcp = agent ? doesAgentSupportMcp(agent) : false;

  const [selectedTransport, setSelectedTransport] =
    useState<DialAppTransportType>(
      transport ??
        (supportsMcp
          ? DialAppTransportType.MCP
          : DialAppTransportType.ChatCompletion),
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blackout">
      <div className="w-96 rounded-lg bg-layer-2 p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">
          {t(MarketplaceI18nKeys.AgentSettings)}
        </h2>
        <p className="mb-4 text-sm text-secondary">
          {t(MarketplaceI18nKeys.AgentSettingsDescription)}
        </p>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">
            {t(MarketplaceI18nKeys.ConnectVia)}
          </label>
          <div className="flex flex-col gap-2">
            {supportsMcp && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={selectedTransport === DialAppTransportType.MCP}
                  onChange={() =>
                    setSelectedTransport(DialAppTransportType.MCP)
                  }
                  className="accent-accent"
                />
                <span>{t(MarketplaceI18nKeys.MCP)}</span>
              </label>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={
                  selectedTransport === DialAppTransportType.ChatCompletion
                }
                onChange={() =>
                  setSelectedTransport(DialAppTransportType.ChatCompletion)
                }
                className="accent-accent"
              />
              <span>{t(MarketplaceI18nKeys.ChatCompletion)}</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <DialButton
            variant={ButtonVariant.Neutral}
            onClick={onClose}
            label={t(MarketplaceI18nKeys.DiscardMarketplace)}
          />
          <DialButton
            variant={ButtonVariant.Primary}
            onClick={() => onSave(selectedTransport)}
            label={t(MarketplaceI18nKeys.ApplyChanges)}
          />
        </div>
      </div>
    </div>
  );
};
