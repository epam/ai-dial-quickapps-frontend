import { IconPlus } from '@tabler/icons-react';
import React, { MouseEvent, useCallback, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { DialLinkButton, mergeClasses } from '@epam/ai-dial-ui-kit';

import { SkillChip } from './SkillChip';
import { SkillsModal } from './SkillsModal';

interface SkillsSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  readonly?: boolean;
  tooltip?: string;
  addButtonClassName?: string;
  // When provided, the parent owns the modal state and renders the Add trigger itself.
  isSelectModalOpen?: boolean;
  onSelectModalOpenChange?: (isOpen: boolean) => void;
}

export const SkillsSelector: React.FC<SkillsSelectorProps> = ({
  value = [],
  onChange,
  readonly,
  tooltip,
  addButtonClassName,
  isSelectModalOpen: isSelectModalOpenProp,
  onSelectModalOpenChange,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { skillsMap } = useDataContext();

  const isControlled = isSelectModalOpenProp != null;
  const [isSelectModalOpenState, setSelectModalOpenState] = useState(false);
  const isSelectModalOpen = isControlled ? isSelectModalOpenProp : isSelectModalOpenState;

  const setSelectModalOpen = useCallback(
    (isOpen: boolean) => {
      if (!isControlled) setSelectModalOpenState(isOpen);
      onSelectModalOpenChange?.(isOpen);
    },
    [isControlled, onSelectModalOpenChange],
  );

  const handleOpenSelectModal = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSelectModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setSelectModalOpen(false);
  }, [setSelectModalOpen]);

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
    [onChange, setSelectModalOpen],
  );

  return (
    <div className="relative grow space-y-4">
      <div className="flex flex-col">
        {!isControlled && (
          <div
            className={mergeClasses(
              'absolute end-0 top-[-29px] flex items-center',
              addButtonClassName,
            )}
          >
            <DialLinkButton
              tooltipProps={{ tooltip: tooltip ?? t(QuickAppEditorI18nKeys.AddAgentSkills) }}
              disabled={readonly}
              onClick={handleOpenSelectModal}
              iconBefore={<IconPlus size={18} />}
              label={t(CommonI18nKeys.Add)}
            />
          </div>
        )}
        {value.length > 0 && (
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
