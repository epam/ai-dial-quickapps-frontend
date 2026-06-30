'use client';
import { IconBulb, IconPlus } from '@tabler/icons-react';
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { MarketplaceI18nKeys } from '@/constants/i18n';
import { DialLinkButton, DialNoDataContent } from '@epam/ai-dial-ui-kit';

interface AgentSkillsSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  readonly?: boolean;
  addBtnTooltip?: string;
  tooltip?: string;
}

export const AgentSkillsSelector: React.FC<AgentSkillsSelectorProps> = ({
  value = [],
  onChange,
  readonly,
  addBtnTooltip,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.Marketplace);

  const handleRemove = (id: string) =>
    onChange(value.filter((v) => v !== id));

  return (
    <div className="relative grow">
      <div className="absolute right-0 top-[-26px]">
        <DialLinkButton
          tooltipProps={{
            tooltip:
              addBtnTooltip ??
              tooltip ??
              t(MarketplaceI18nKeys.AddAgentSkills),
          }}
          disabled
          iconBefore={<IconPlus size={18} />}
          label={t(MarketplaceI18nKeys.AddMarketplace)}
          onClick={(e) => e.preventDefault()}
        />
      </div>
      {!value.length ? (
        <DialNoDataContent
          title={t(MarketplaceI18nKeys.NoAgentSkillsAdded)}
          icon={<IconBulb size={60} stroke={0.5} />}
          containerClassName="rounded border border-primary p-4"
        />
      ) : (
        <div className="flex flex-col gap-2 overflow-hidden rounded">
          {value.map((promptId) => (
            <div
              key={promptId}
              className="flex items-center justify-between rounded bg-layer-3 px-3 py-2"
            >
              <span className="truncate text-sm">{promptId}</span>
              {!readonly && (
                <button
                  onClick={() => handleRemove(promptId)}
                  className="ml-2 shrink-0 text-secondary hover:text-error"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
