import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAddOnEntityMap } from '@/hooks/use-add-on-entity-map';
import { useListRemoveFocus } from '@/hooks/use-list-remove-focus';
import { useTranslation } from '@/hooks/use-translation';
import type { DialModel } from '@/types/dial-entities';
import type { DialAppTransportType } from '@/types/quick-apps';
import { Translation } from '@/types/translation';
import { getAddOnDisplay } from '@/utils/get-add-on-display';
import { getEntityStatus, getEntityStatusMessage } from '@/utils/get-entity-status';

import { AddOnListItem } from '@/components/common/AddOnListItem/AddOnListItem';

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
  isReadonly: boolean;
  onChange: (allIds: string[]) => void;
  /** The transport saved per agent entry, if any. */
  transports: Record<string, DialAppTransportType | undefined>;
  onConfigure: (id: string, transport: DialAppTransportType) => void;
}

/** The attached agents (applications, MCP agents, models) of the Agents row. */
const AgentsList: FC<AgentsListProps> = ({
  ids,
  allIds,
  isReadonly,
  onChange,
  transports,
  onConfigure,
}) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const entityMap = useAddOnEntityMap();
  const { listRef, markRemoval } = useListRemoveFocus(ids);

  const handleRemove = useCallback(
    (id: string) => {
      markRemoval();
      onChange(allIds.filter((value) => value !== id));
    },
    [markRemoval, onChange, allIds],
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
          const statusText = getEntityStatusMessage(
            getEntityStatus(agent, id),
            true,
            tCommon,
            tCommon(CommonI18nKeys.AgentEntityType),
          );
          return (
            <li key={id}>
              <AddOnListItem
                id={id}
                name={name}
                version={version}
                iconUrl={iconUrl}
                statusText={statusText}
                detailsLabel={t(QuickAppEditorI18nKeys.AddOnDetails, { name })}
                removeLabel={t(QuickAppEditorI18nKeys.RemoveAddOn, { name })}
                onClick={setOpenAgentId}
                onRemove={isReadonly ? undefined : handleRemove}
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
            isReadonly={isReadonly}
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
