import React, { useCallback } from 'react';

import { useDataContext } from '@/context/DataContext';

import { SkillChip } from './SkillChip';
import { SkillsModal } from './SkillsModal';

interface SkillsSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
  readonly?: boolean;
  // The parent owns the modal state and renders the Add trigger.
  isSelectModalOpen: boolean;
  onSelectModalOpenChange: (isOpen: boolean) => void;
}

export const SkillsSelector: React.FC<SkillsSelectorProps> = ({
  value = [],
  onChange,
  readonly,
  isSelectModalOpen,
  onSelectModalOpenChange,
}) => {
  const { skillsMap } = useDataContext();

  const handleCloseModal = useCallback(() => {
    onSelectModalOpenChange(false);
  }, [onSelectModalOpenChange]);

  const handleRemoveItem = useCallback(
    (idToRemove: string) => {
      onChange(value.filter((id) => id !== idToRemove));
    },
    [onChange, value],
  );

  const handleConfirmSelection = useCallback(
    (newIds: string[]) => {
      onChange(newIds);
      onSelectModalOpenChange(false);
    },
    [onChange, onSelectModalOpenChange],
  );

  return (
    <div className="relative grow space-y-4">
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
