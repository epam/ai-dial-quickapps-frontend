import { FC, lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { useDataContext } from '@/context/DataContext';
import { getEntityNameFromId } from '@/utils/api';

import { SkillListItem } from './SkillListItem';

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
  const { skillsMap } = useDataContext();
  const [openSkillId, setOpenSkillId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Set when Delete removes the item that opened the popup, so focus lands on
  // the list instead of being lost with the removed button.
  const shouldRefocusListRef = useRef(false);

  useEffect(() => {
    if (!shouldRefocusListRef.current) return;
    shouldRefocusListRef.current = false;
    listRef.current?.querySelector('button')?.focus();
  }, [value]);

  const handleClose = useCallback(() => setOpenSkillId(null), []);

  const handleRemove = useCallback(
    (id: string) => {
      shouldRefocusListRef.current = true;
      onRemove(id);
    },
    [onRemove],
  );

  if (value.length === 0) return null;

  const openSkill = openSkillId == null ? undefined : skillsMap[openSkillId];

  return (
    <>
      <ul ref={listRef} className="flex flex-col gap-2">
        {value.map((id) => {
          const skill = skillsMap[id];
          return (
            <li key={id}>
              <SkillListItem
                id={id}
                name={skill?.name ?? getEntityNameFromId(id)}
                version={skill?.version}
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
