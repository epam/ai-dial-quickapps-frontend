"use client";
import { IconBulb, IconPlus } from "@tabler/icons-react";
import { FC, memo, useCallback, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Translation } from "@/types/translation";
import { MarketplaceI18nKeys } from "@/constants/i18n";
import { DialLinkButton, DialNoDataContent } from "@epam/ai-dial-ui-kit";
import AgentSkillsItem from "./AgentSkillsItem";
import AgentSkillsModal from "./AgentSkillsModal";

interface AgentSkillsSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  readonly?: boolean;
  addBtnTooltip?: string;
  tooltip?: string;
}

const AgentSkillsSelector: FC<AgentSkillsSelectorProps> = ({
  value = [],
  onChange,
  readonly,
  addBtnTooltip,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRemove = useCallback(
    (promptId: string) => onChange(value.filter((id) => id !== promptId)),
    [onChange, value],
  );

  const handleOpenModal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

  const handleConfirm = useCallback(
    (ids: string[]) => {
      onChange(ids);
      setIsModalOpen(false);
    },
    [onChange],
  );

  return (
    <div className="relative grow">
      <div className="absolute end-0 top-[-26px]">
        <DialLinkButton
          tooltipProps={{
            tooltip:
              addBtnTooltip ?? tooltip ?? t(MarketplaceI18nKeys.AddAgentSkills),
          }}
          disabled={!!readonly}
          iconBefore={<IconPlus size={18} />}
          label={t(MarketplaceI18nKeys.AddMarketplace)}
          onClick={handleOpenModal}
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
            <AgentSkillsItem
              key={promptId}
              promptId={promptId}
              onDelete={handleRemove}
              readonly={readonly}
            />
          ))}
        </div>
      )}

      {isModalOpen && !readonly && (
        <AgentSkillsModal
          initialSelectedIds={value}
          onClose={handleCloseModal}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
};

export default memo(AgentSkillsSelector);
