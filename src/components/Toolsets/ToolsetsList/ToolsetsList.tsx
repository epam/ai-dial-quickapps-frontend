import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAddOnEntityMap } from '@/hooks/use-add-on-entity-map';
import { useListRemoveFocus } from '@/hooks/use-list-remove-focus';
import { useTranslation } from '@/hooks/use-translation';
import type { DialToolset } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { getAddOnDisplay } from '@/utils/get-add-on-display';
import { getEntityStatus, getEntityStatusMessage } from '@/utils/get-entity-status';

import { AddOnListItem } from '@/components/common/AddOnListItem/AddOnListItem';

// The badge comes from the catalog bundle (ag-grid), which stays out of the
// editor's initial chunk.
const ToolsetBadge = lazy(async () => ({
  default: (await import('@/components/Toolsets/ToolsetBadge/ToolsetBadge')).ToolsetBadge,
}));

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
  isReadonly: boolean;
  onChange: (allIds: string[]) => void;
}

/** The attached toolsets of the Toolsets row; each item opens that toolset's details. */
const ToolsetsList: FC<ToolsetsListProps> = ({ ids, allIds, isReadonly, onChange }) => {
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

  const [openToolsetId, setOpenToolsetId] = useState<string | null>(null);
  const handleClose = useCallback(() => setOpenToolsetId(null), []);

  if (ids.length === 0) return null;

  return (
    <>
      <ul ref={listRef} className="flex flex-col gap-2">
        {ids.map((id) => {
          const toolset = entityMap[id] as DialToolset | undefined;
          const { name, version, iconUrl } = getAddOnDisplay(id, toolset, language);
          const statusText = getEntityStatusMessage(
            getEntityStatus(toolset, id),
            true,
            tCommon,
            tCommon(CommonI18nKeys.ToolsetEntityType),
          );
          return (
            <li key={id}>
              <AddOnListItem
                id={id}
                name={name}
                version={version}
                iconUrl={iconUrl}
                statusText={statusText}
                badge={
                  toolset && (
                    <Suspense fallback={null}>
                      <ToolsetBadge
                        toolset={toolset}
                        label={t(QuickAppEditorI18nKeys.ToolsetLoggedOutBadge)}
                      />
                    </Suspense>
                  )
                }
                detailsLabel={t(QuickAppEditorI18nKeys.SkillDetails, { name })}
                removeLabel={t(QuickAppEditorI18nKeys.RemoveSkill, { name })}
                onClick={setOpenToolsetId}
                onRemove={isReadonly ? undefined : handleRemove}
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
            isReadonly={isReadonly}
            onRemove={handleRemove}
            onClose={handleClose}
          />
        </Suspense>
      )}
    </>
  );
};

export default memo(ToolsetsList);
