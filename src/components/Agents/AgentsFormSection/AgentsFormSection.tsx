import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { AddOnsModalQueryParams } from '@/constants/quick-apps';
import { useSearchParams } from '@/hooks/use-search-params';
import { useTranslation } from '@/hooks/use-translation';
import type { DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';

import { AddOnRow } from '@/components/AddOns/AddOnRow';
import AgentsList from '@/components/Agents/AgentsList/AgentsList';

// The picker brings in the catalog list (ag-grid + @epam/ai-dial-catalog),
// so it loads on first open instead of with the editor.
const AddAgentsModal = lazy(async () => ({
  default: (await import('@/components/Agents/AddAgentsModal/AddAgentsModal')).AddAgentsModal,
}));

export interface AgentsFormSectionProps {
  /** Every `addOns` id, in order. */
  allIds: string[];
  /** The agent entries among them. */
  agentIds: string[];
  isReadonly: boolean;
  tooltip?: string;
  onChange: (allIds: string[]) => void;
  /** The transport saved per agent entry, if any. */
  transports: Record<string, DialAppTransportType | undefined>;
  onConfigure: (id: string, transport: DialAppTransportType) => void;
}

/** The Agents row of the Add-ons card: the attached agents and the Add agent picker. */
const AgentsFormSection: FC<AgentsFormSectionProps> = ({
  allIds,
  agentIds,
  isReadonly,
  tooltip,
  onChange,
  transports,
  onConfigure,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const searchParams = useSearchParams();
  // The host can deep-link straight into the picker (`agentsAndToolsetsModal=1`).
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    searchParams.get(AddOnsModalQueryParams.Modal) === '1',
  );

  const handleCloseModal = useCallback(() => setIsAddModalOpen(false), []);

  const handleConfirm = useCallback(
    (ids: string[]) => {
      onChange(ids);
      setIsAddModalOpen(false);
    },
    [onChange],
  );

  return (
    <AddOnRow
      label={t(QuickAppEditorI18nKeys.Agents)}
      emptyDescription={t(QuickAppEditorI18nKeys.AgentsDescription)}
      isEmpty={agentIds.length === 0}
      isAddDisabled={isReadonly}
      addTooltip={tooltip ?? t(QuickAppEditorI18nKeys.AddAgents)}
      onAdd={() => setIsAddModalOpen(true)}
    >
      <AgentsList
        ids={agentIds}
        allIds={allIds}
        isReadonly={isReadonly}
        onChange={onChange}
        transports={transports}
        onConfigure={onConfigure}
      />

      {isAddModalOpen && !isReadonly && (
        <Suspense fallback={null}>
          <AddAgentsModal
            allIds={allIds}
            agentIds={agentIds}
            onClose={handleCloseModal}
            onConfirm={handleConfirm}
          />
        </Suspense>
      )}
    </AddOnRow>
  );
};

export default memo(AgentsFormSection);
