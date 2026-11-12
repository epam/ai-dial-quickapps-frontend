import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { AddOnsModalQueryParams } from '@/constants/quick-apps';
import { useSearchParams } from '@/hooks/use-search-params';
import { useTranslation } from 'react-i18next';
import type { DialAppTransportType } from '@/types/quick-apps';

import { AddOnRow } from '@/components/AddOns/AddOnRow/AddOnRow';

// The rows come from the catalog bundle, whose markdown chunk would otherwise
// load with the editor, so the list is a chunk of its own.
const AgentsList = lazy(() => import('@/components/Agents/AgentsList/AgentsList'));

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
  /** `switchedIds`: entries of the other row checked in the popup, which move to this row. */
  onChange: (allIds: string[], switchedIds?: string[]) => void;
  /** The transport saved per agent entry, if any. */
  transports: Record<string, DialAppTransportType | undefined>;
  onConfigure: (id: string, transport: DialAppTransportType) => void;
}

/** The Agents row of the Add-ons card: the attached agents and the Add agent picker. */
const AgentsFormSection: FC<AgentsFormSectionProps> = ({
  allIds,
  agentIds,
  onChange,
  transports,
  onConfigure,
}) => {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  // The host can deep-link straight into the picker (`agentsAndToolsetsModal=1`).
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    searchParams.get(AddOnsModalQueryParams.Modal) === '1',
  );

  const handleCloseModal = useCallback(() => setIsAddModalOpen(false), []);

  const handleConfirm = useCallback(
    (ids: string[]) => {
      // The popup answers for this row's entries only: drop those it unchecked
      // and append the new ones; the other row's entries stay where they are.
      const removedIds = agentIds.filter((id) => !ids.includes(id));
      const switchedIds = ids.filter((id) => allIds.includes(id) && !agentIds.includes(id));
      const nextIds = [
        ...allIds.filter((id) => !removedIds.includes(id)),
        ...ids.filter((id) => !allIds.includes(id)),
      ];
      onChange(nextIds, switchedIds);
      setIsAddModalOpen(false);
    },
    [onChange, allIds, agentIds],
  );

  return (
    <AddOnRow
      label={t(ApplicationEditorI18nKeys.AgentsTitle)}
      emptyDescription={t(ApplicationEditorI18nKeys.AgentsDescription)}
      isEmpty={agentIds.length === 0}
      addTooltip={t(ApplicationEditorI18nKeys.AgentsAddMany)}
      onAdd={() => setIsAddModalOpen(true)}
    >
      <Suspense fallback={null}>
        <AgentsList
          ids={agentIds}
          allIds={allIds}
          onChange={onChange}
          transports={transports}
          onConfigure={onConfigure}
        />
      </Suspense>

      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AddAgentsModal
            allIds={allIds}
            otherRowIds={allIds.filter((id) => !agentIds.includes(id))}
            onClose={handleCloseModal}
            onConfirm={handleConfirm}
          />
        </Suspense>
      )}
    </AddOnRow>
  );
};

export default memo(AgentsFormSection);
