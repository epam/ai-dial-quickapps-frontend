import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { FC, useCallback, useMemo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useEntityDetails } from '@/hooks/use-entity-details';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useTranslation } from '@/hooks/use-translation';
import type { DialSkill } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { getCatalogFolder, getEntityScopeInfo } from '@/utils/entity-scope';
import { mapSkillToCatalogItem } from '@/utils/map-skill-to-catalog-item';

import { AddOnDetailsPopup } from '@/components/common/AddOnDetailsPopup/AddOnDetailsPopup';

export interface SkillDetailsPopupProps {
  skillId: string;
  /** Undefined when the attached skill is no longer in the catalog. */
  skill?: DialSkill;
  /** Shown while the skill is missing from the catalog. */
  fallbackName: string;
  isReadonly: boolean;
  onRemove: (id: string) => void;
  onClose: () => void;
}

/**
 * A skill's details — the catalog's Details (its rendered `SKILL.md`) and
 * Overview — plus Delete, which detaches the skill from this application
 * (the skill itself is untouched).
 */
export const SkillDetailsPopup: FC<SkillDetailsPopupProps> = ({
  skillId,
  skill,
  fallbackName,
  isReadonly,
  onRemove,
  onClose,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();

  const folder = useMemo(
    () => getCatalogFolder(getEntityScopeInfo(skillId, userBucket), scopeLabels),
    [skillId, userBucket, scopeLabels],
  );

  const listingItem = useMemo(
    () => (skill == null ? undefined : mapSkillToCatalogItem(skill, { userBucket, scopeLabels })),
    [skill, userBucket, scopeLabels],
  );
  const { status, details, retry, onLoadContentFile } = useEntityDetails(listingItem);
  const item = useMemo(
    () => (listingItem == null ? undefined : { ...listingItem, details }),
    [listingItem, details],
  );

  const handleDelete = useCallback(() => {
    onRemove(skillId);
    onClose();
  }, [onRemove, onClose, skillId]);

  return (
    <AddOnDetailsPopup
      entityType={CatalogEntityType.Skill}
      name={skill?.name ?? fallbackName}
      version={skill?.version}
      folder={folder}
      item={item}
      detailsStatus={status}
      onRetry={retry}
      onLoadContentFile={onLoadContentFile}
      unavailableText={skill == null ? t(QuickAppEditorI18nKeys.SkillUnavailable) : undefined}
      isReadonly={isReadonly}
      deleteLabel={t(QuickAppEditorI18nKeys.RemoveAddOnFromApp)}
      onDelete={handleDelete}
      onClose={onClose}
    />
  );
};
