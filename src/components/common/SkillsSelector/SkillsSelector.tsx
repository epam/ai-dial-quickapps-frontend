'use client';
import { IconLayoutGrid, IconPlus } from '@tabler/icons-react';
import React, { MouseEvent, useCallback, useState } from 'react';

import { CommonI18nKeys, MarketplaceI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { DialLinkButton, DialNoDataContent } from '@epam/ai-dial-ui-kit';

import { SkillChip } from './SkillChip';
import { SkillsModal } from './SkillsModal';

interface SkillsSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  readonly?: boolean;
  tooltip?: string;
}

export const SkillsSelector: React.FC<SkillsSelectorProps> = ({
  value = [],
  onChange,
  readonly,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { skillsMap } = useDataContext();

  const [isSelectModalOpen, setSelectModalOpen] = useState(false);

  const handleOpenSelectModal = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSelectModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setSelectModalOpen(false);
  }, []);

  const handleRemoveItem = useCallback(
    (idToRemove: string) => {
      onChange(value.filter((id) => id !== idToRemove));
    },
    [onChange, value],
  );

  const handleConfirmSelection = useCallback(
    (newIds: string[]) => {
      onChange(newIds);
      setSelectModalOpen(false);
    },
    [onChange],
  );

  return (
    <div className="relative grow space-y-4">
      <div className="flex flex-col">
        <div className="absolute right-0 top-[-29px] flex items-center">
          <DialLinkButton
            tooltipProps={{ tooltip: tooltip ?? t(MarketplaceI18nKeys.AddAgentSkills) }}
            disabled={readonly}
            onClick={handleOpenSelectModal}
            iconBefore={<IconPlus size={18} />}
            label={t(CommonI18nKeys.AddCommon)}
          />
        </div>
        {!value.length ? (
          <DialNoDataContent
            title={t(MarketplaceI18nKeys.NoAgentSkillsAdded)}
            icon={<IconLayoutGrid size={60} stroke={0.5} />}
            containerClassName="rounded border border-primary p-4"
          />
        ) : (
          <div className="flex flex-wrap gap-1 rounded border border-primary p-2">
            {value.map((id) => (
              <SkillChip
                key={id}
                id={id}
                item={skillsMap[id]}
                onRemove={readonly ? undefined : handleRemoveItem}
                readonly={readonly}
              />
            ))}
          </div>
        )}
      </div>

      {isSelectModalOpen && !readonly && (
        <SkillsModal
          initialSelectedIds={value}
          onClose={handleCloseModal}
          onConfirm={handleConfirmSelection}
        />
      )}
    </div>
  );
};
