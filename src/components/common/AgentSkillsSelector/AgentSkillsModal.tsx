"use client";
import { FC, useCallback, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Translation } from "@/types/translation";
import { CommonI18nKeys, MarketplaceI18nKeys } from "@/constants/i18n";
import { useDataContext } from "@/context/DataContext";
import {
  DialNeutralButton,
  DialPopup,
  DialPrimaryButton,
  DialSearch,
} from "@epam/ai-dial-ui-kit";

interface AgentSkillsModalProps {
  initialSelectedIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

const AgentSkillsModal: FC<AgentSkillsModalProps> = ({
  initialSelectedIds,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { prompts } = useDataContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  const filteredPrompts = useMemo(() => {
    const lower = searchTerm.toLowerCase();
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.id.toLowerCase().includes(lower),
    );
  }, [prompts, searchTerm]);

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(selectedIds);
  }, [selectedIds, onConfirm]);

  return (
    <DialPopup
      open
      header={t(MarketplaceI18nKeys.AddAgentSkills)}
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end gap-2">
          <DialNeutralButton
            label={tCommon(CommonI18nKeys.Cancel)}
            onClick={onClose}
          />
          <DialPrimaryButton
            label={t(MarketplaceI18nKeys.SelectAgentSkills)}
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
          />
        </div>
      }
    >
      <div className="flex flex-col">
        <div className="px-6 pb-2 pt-2">
          <DialSearch
            placeholder={t(MarketplaceI18nKeys.SearchAgentSkills)}
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          {filteredPrompts.length === 0 ? (
            <p className="py-10 text-center text-sm text-secondary">
              {t(MarketplaceI18nKeys.NoAgentSkillsAdded)}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filteredPrompts.map((prompt) => {
                const isSelected = selectedIds.includes(prompt.id);
                return (
                  <label
                    key={prompt.id}
                    className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 hover:bg-layer-3"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(prompt.id)}
                      className="shrink-0 accent-accent-primary"
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-primary">
                        {prompt.name}
                      </span>
                      {prompt.folderId && (
                        <span className="truncate text-xs text-secondary">
                          {prompt.folderId}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DialPopup>
  );
};

export default AgentSkillsModal;
