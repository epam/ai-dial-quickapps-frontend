import { IconPlus } from '@tabler/icons-react';
import React, { MouseEvent, useCallback, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useSearchParams } from '@/hooks/useSearchParams';
import { requestApplicationCredentials } from '@/utils/request-application-credentials';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { CommonI18nKeys } from '@/constants/i18n';
import { AgentsAndToolsetsModalQueryParams } from '@/constants/quick-apps';
import { ToggleSwitch } from '@/components/common/ToggleSwitch/ToggleSwitch';
import { AgentAndToolsetChip, type ChipEntity } from './AgentAndToolsetChip';
import { AgentAndToolsetModal } from './AgentAndToolsetModal';
import { ToolsetLoginModal } from './ToolsetLoginModal';
import { DialLinkButton, mergeClasses } from '@epam/ai-dial-ui-kit';

interface AgentAndToolsetSelectorProps {
  value: string[];
  onChange: (agentAndToolset: string[]) => void;
  readonly?: boolean;
  addBtnTooltip?: string;
  allItemsMap: Record<string, ChipEntity | undefined>;
  tooltip?: string;
  addButtonClassName?: string;
  onItemClick?: (id: string) => void;
  onJsonSwitchClick?: () => void;
  onConfigureClick?: (item: ChipEntity) => void;
  // When provided, the parent owns the modal state and renders the Add/JSON controls itself.
  isSelectModalOpen?: boolean;
  onSelectModalOpenChange?: (isOpen: boolean) => void;
}

export const AgentAndToolsetSelector: React.FC<AgentAndToolsetSelectorProps> = ({
  value = [],
  readonly,
  addBtnTooltip,
  tooltip,
  addButtonClassName,
  allItemsMap,
  onChange,
  onItemClick,
  onJsonSwitchClick,
  onConfigureClick,
  isSelectModalOpen: isSelectModalOpenProp,
  onSelectModalOpenChange,
}) => {
  const { t } = useTranslation(Translation.Common);
  const searchParams = useSearchParams();
  const { settings } = useAppContext();

  const isControlled = isSelectModalOpenProp != null;
  const [isSelectModalOpenState, setSelectModalOpenState] = useState(
    searchParams.get(AgentsAndToolsetsModalQueryParams.Modal) === '1',
  );
  const isSelectModalOpen = isControlled ? isSelectModalOpenProp : isSelectModalOpenState;
  const [loginToolset, setLoginToolset] = useState<ChipEntity | null>(null);

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
            <span>
              <DialLinkButton
                tooltipProps={{
                  tooltip: addBtnTooltip ?? tooltip ?? t(CommonI18nKeys.AddAgentsAndToolsets),
                }}
                disabled={readonly}
                onClick={handleOpenSelectModal}
                iconBefore={<IconPlus size={18} />}
                label={t(CommonI18nKeys.Add)}
              />
            </span>
            {!!onJsonSwitchClick && (
              <>
                <div className="ms-1 me-3 h-3 w-0 border-s border-primary" />
                <span>
                  <ToggleSwitch
                    isOn={false}
                    handleSwitch={onJsonSwitchClick}
                    disabled={readonly}
                    additionalText={t(CommonI18nKeys.JSON)}
                    className="flex w-fit items-center gap-2"
                    tooltip={t(
                      !readonly
                        ? CommonI18nKeys.SwitchToJsonView
                        : CommonI18nKeys.PublicAppCannotBeEdited,
                    )}
                  />
                </span>
              </>
            )}
          </div>
        )}
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
      </div>

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
