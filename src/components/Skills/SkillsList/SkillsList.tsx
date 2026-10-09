import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useListRemoveFocus } from '@/hooks/use-list-remove-focus';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';
import { getEntityNameFromId } from '@/utils/api';

import { AddOnListItem } from '@/components/common/AddOnListItem/AddOnListItem';

// The popup renders the manifest with the catalog's `ContentTab`, which brings
// in the catalog bundle (ag-grid), so it loads on first open.
const SkillDetailsPopup = lazy(async () => ({
  default: (await import('@/components/Skills/SkillDetailsPopup/SkillDetailsPopup'))
    .SkillDetailsPopup,
}));

export interface SkillsListProps {
  value: string[];
  isReadonly: boolean;
  onRemove: (id: string) => void;
}

/** The attached skills of the Skills row; each item opens that skill's details. */
const SkillsList: FC<SkillsListProps> = ({ value, isReadonly, onRemove }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { skillsMap } = useDataContext();
  const [openSkillId, setOpenSkillId] = useState<string | null>(null);
  // Delete removes the item that opened the popup, so focus lands on the list
  // instead of being lost with the removed button.
  const { listRef, markRemoval } = useListRemoveFocus(value);

  const handleClose = useCallback(() => setOpenSkillId(null), []);

  const handleRemove = useCallback(
    (id: string) => {
      markRemoval();
      onRemove(id);
    },
    [markRemoval, onRemove],
  );

  if (value.length === 0) return null;

  const openSkill = openSkillId == null ? undefined : skillsMap[openSkillId];

  return (
    <>
      <ul ref={listRef} className="flex flex-col gap-2">
        {value.map((id) => {
          const skill = skillsMap[id];
          const name = skill?.name ?? getEntityNameFromId(id);
          return (
            <li key={id}>
              <AddOnListItem
                id={id}
                name={name}
                version={skill?.version}
                detailsLabel={t(QuickAppEditorI18nKeys.AddOnDetails, { name })}
                removeLabel={t(QuickAppEditorI18nKeys.RemoveAddOn, { name })}
                onClick={setOpenSkillId}
                onRemove={isReadonly ? undefined : handleRemove}
              />
            </li>
          );
        })}
      </ul>

      {openSkillId != null && (
        <Suspense fallback={null}>
          <SkillDetailsPopup
            skillId={openSkillId}
            skill={openSkill}
            fallbackName={getEntityNameFromId(openSkillId)}
            isReadonly={isReadonly}
            onRemove={handleRemove}
            onClose={handleClose}
          />
        </Suspense>
      )}
    </>
  );
};

export default memo(SkillsList);
