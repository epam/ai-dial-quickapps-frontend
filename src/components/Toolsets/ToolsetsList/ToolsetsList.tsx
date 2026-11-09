import { AddOnListItem, useListRemoveFocus } from '@epam/ai-dial-catalog';
import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { ApplicationEditorI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import { useDataContext } from '@/context/DataContext';
import { useAddOnEntityMap } from '@/hooks/use-add-on-entity-map';
import { useTranslation } from 'react-i18next';
import type { DialToolset } from '@/types/dial-entities';
import { LoadStatus } from '@/types/load-status';
import { getAddOnDisplay } from '@/utils/get-add-on-display';
import { getEntityStatus, getEntityStatusMessage } from '@/utils/get-entity-status';
import { mapToolsetCredentials } from '@/utils/map-toolset-to-catalog-item';
import { renderEntityStatus } from '@/utils/render-entity-status';

// The popup renders Markdown and catalog pieces, so it loads on first open.
const ToolsetDetailsPopup = lazy(async () => ({
  default: (await import('@/components/Toolsets/ToolsetDetailsPopup/ToolsetDetailsPopup'))
    .ToolsetDetailsPopup,
}));

export interface ToolsetsListProps {
  /** The toolset entries of `addOns`, in order. */
  ids: string[];
  /** Every `addOns` id; edits keep the agent ids in place. */
  allIds: string[];
  /** The saved config of each entry by id, for toolsets defined inline in the JSON. */
  inlineConfigs?: Record<string, Record<string, unknown>>;
  onChange: (allIds: string[]) => void;
}

/** The attached toolsets of the Toolsets row; each item opens that toolset's details. */
const ToolsetsList: FC<ToolsetsListProps> = ({ ids, allIds, inlineConfigs, onChange }) => {
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

  const [openToolsetId, setOpenToolsetId] = useState<string | null>(null);
  const handleClose = useCallback(() => setOpenToolsetId(null), []);

  if (ids.length === 0) return null;

  return (
    <>
      <ul ref={listRef} className="flex flex-col gap-2">
        {ids.map((id) => {
          const toolset = entityMap[id] as DialToolset | undefined;
          const { name, version, iconUrl } = getAddOnDisplay(id, toolset, language);
          const statusMessage = getEntityStatusMessage(
            getEntityStatus(toolset, id, isCatalogReady),
            t,
            t(ApplicationEditorI18nKeys.AddOnsEntityTypeToolset),
          );
          return (
            <li key={id}>
              <AddOnListItem
                name={name}
                version={version}
                iconUrl={iconUrl}
                description={renderEntityStatus(statusMessage)}
                // An unknown toolset has no auth settings, so it gets no badge.
                credentials={toolset && mapToolsetCredentials(toolset)}
                labels={{
                  remove: t(ApplicationEditorI18nKeys.AddOnsRemove, { name }),
                  credentialsBadge: t(CatalogI18nKeys.CredentialsBadgeLoggedOut),
                }}
                onOpen={() => setOpenToolsetId(id)}
                onRemove={() => handleRemove(id)}
              />
            </li>
          );
        })}
      </ul>

      {openToolsetId != null && (
        <Suspense fallback={null}>
          <ToolsetDetailsPopup
            toolsetId={openToolsetId}
            toolset={entityMap[openToolsetId] as DialToolset | undefined}
            inlineConfig={inlineConfigs?.[openToolsetId]}
            onRemove={handleRemove}
            onClose={handleClose}
          />
        </Suspense>
      )}
    </>
  );
};

export default memo(ToolsetsList);
