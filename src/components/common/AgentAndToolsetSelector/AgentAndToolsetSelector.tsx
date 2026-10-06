import React, { useCallback, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useSearchParams } from '@/hooks/useSearchParams';
import { requestApplicationCredentials } from '@/utils/request-application-credentials';
import { AgentAndToolsetChip, type ChipEntity } from './AgentAndToolsetChip';
import { AgentAndToolsetModal } from './AgentAndToolsetModal';
import { ToolsetLoginModal } from './ToolsetLoginModal';

interface AgentAndToolsetSelectorProps {
  value: string[];
  onChange: (agentAndToolset: string[]) => void;
  readonly?: boolean;
  allItemsMap: Record<string, ChipEntity | undefined>;
  // The parent owns the modal state and renders the Add trigger.
  isSelectModalOpen: boolean;
  onSelectModalOpenChange: (isOpen: boolean) => void;
  onItemClick?: (id: string) => void;
  onConfigureClick?: (item: ChipEntity) => void;
}

export const AgentAndToolsetSelector: React.FC<AgentAndToolsetSelectorProps> = ({
  value = [],
  readonly,
  allItemsMap,
  isSelectModalOpen,
  onSelectModalOpenChange,
  onChange,
  onItemClick,
  onConfigureClick,
}) => {
  const searchParams = useSearchParams();
  const { settings } = useAppContext();

  const [loginToolset, setLoginToolset] = useState<ChipEntity | null>(null);

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
            <AgentAndToolsetChip
              key={id}
              id={id}
              item={allItemsMap[id]}
              onRemove={readonly ? undefined : handleRemoveItem}
              readonly={readonly}
              onItemClick={onItemClick}
              onConfigure={onConfigureClick}
              onLoginToolset={setLoginToolset}
              onApplicationCredentials={
                searchParams.get('applicationCredentials') === 'true'
                  ? (item) => requestApplicationCredentials(item.id, settings.allowedOrigin)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {isSelectModalOpen && !readonly && (
        <AgentAndToolsetModal
          initialSelectedIds={value}
          allItemsMap={allItemsMap}
          onClose={handleCloseModal}
          onConfirm={handleConfirmSelection}
        />
      )}

      {loginToolset && (
        <ToolsetLoginModal toolset={loginToolset} onClose={() => setLoginToolset(null)} />
      )}
    </div>
  );
};
