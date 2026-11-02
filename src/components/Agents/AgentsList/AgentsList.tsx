import { AddOnListItem, useListRemoveFocus } from '@epam/ai-dial-catalog';
import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useDataContext } from '@/context/DataContext';
import { useAddOnEntityMap } from '@/hooks/use-add-on-entity-map';
import { useTranslation } from 'react-i18next';
import type { DialModel } from '@/types/dial-entities';
import { LoadStatus } from '@/types/load-status';
import type { DialAppTransportType } from '@/types/quick-apps';
import { getAddOnDisplay } from '@/utils/get-add-on-display';
import { getEntityStatus, getEntityStatusMessage } from '@/utils/get-entity-status';
import { renderEntityStatus } from '@/utils/render-entity-status';

// The popup renders Markdown and catalog pieces, so it loads on first open.
const AgentDetailsPopup = lazy(async () => ({
  default: (await import('@/components/Agents/AgentDetailsPopup/AgentDetailsPopup'))
    .AgentDetailsPopup,
}));

export interface AgentsListProps {
  /** The agent entries of `addOns`, in order. */
  ids: string[];
  /** Every `addOns` id; edits keep the toolset ids in place. */
  allIds: string[];
  onChange: (allIds: string[]) => void;
  /** The transport saved per agent entry, if any. */
  transports: Record<string, DialAppTransportType | undefined>;
  onConfigure: (id: string, transport: DialAppTransportType) => void;
}

/** The attached agents (applications, MCP agents, models) of the Agents row. */
const AgentsList: FC<AgentsListProps> = ({ ids, allIds, onChange, transports, onConfigure }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const entityMap = useAddOnEntityMap();
  const isCatalogReady = useDataContext().status === LoadStatus.Ready;
  // A removal takes the item's buttons with it, so focus moves to the list
  // instead of being lost on the page.
  const listRef = useListRemoveFocus<HTMLUListElement>(ids.length);

  const handleRemove = useCallback(
    (id: string) => onChange(allIds.filter((value) => value !== id)),
    [onChange, allIds],
  );

  const [openAgentId, setOpenAgentId] = useState<string | null>(null);
  const handleClose = useCallback(() => setOpenAgentId(null), []);

  if (ids.length === 0) return null;

  return (
    <>
      <ul ref={listRef} className="flex flex-col gap-2">
        {ids.map((id) => {
          const agent = entityMap[id] as DialModel | undefined;
          const { name, version, iconUrl } = getAddOnDisplay(id, agent, language);
          const statusMessage = getEntityStatusMessage(
            getEntityStatus(agent, id, isCatalogReady),
            t,
            t(ApplicationEditorI18nKeys.AddOnsEntityTypeAgent),
          );
          return (
            <li key={id}>
              <AddOnListItem
                name={name}
                version={version}
                iconUrl={iconUrl}
                description={renderEntityStatus(statusMessage)}
                labels={{ remove: t(ApplicationEditorI18nKeys.AddOnsRemove, { name }) }}
                onOpen={() => setOpenAgentId(id)}
                onRemove={() => handleRemove(id)}
              />
            </li>
          );
        })}
      </ul>

      {openAgentId != null && (
        <Suspense fallback={null}>
          <AgentDetailsPopup
            agentId={openAgentId}
            agent={entityMap[openAgentId] as DialModel | undefined}
            transport={transports[openAgentId]}
            onRemove={handleRemove}
            onConfigure={onConfigure}
            onClose={handleClose}
          />
        </Suspense>
      )}
    </>
  );
};

export default memo(AgentsList);
