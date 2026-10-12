import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { FC, useMemo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';
import { isHiddenDialFolderId } from '@/utils/api';
import { mapSkillToCatalogItem } from '@/utils/map-skill-to-catalog-item';

import {
  AddOnCatalogModal,
  type AddOnCatalogModalLabels,
} from '@/components/common/AddOnCatalogModal/AddOnCatalogModal';

export interface AddSkillsModalProps {
  /** The attached skill ids; checked when the popup opens. */
  value: string[];
  /** Called with the new `agentSkills` value when the user confirms with Add. */
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

/** Skill picker: the skills catalog with multi-selection. */
export const AddSkillsModal: FC<AddSkillsModalProps> = ({ value, onConfirm, onClose }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { skills, userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();

  const items = useMemo(
    () =>
      skills
        .filter((skill) => !isHiddenDialFolderId(skill.id))
        .map((skill) => mapSkillToCatalogItem(skill, { userBucket, scopeLabels })),
    [skills, userBucket, scopeLabels],
  );

  const labels = useMemo<AddOnCatalogModalLabels>(
    () => ({
      title: t(QuickAppEditorI18nKeys.AddSkill),
      catalog: t(QuickAppEditorI18nKeys.SkillsCatalog),
      search: t(QuickAppEditorI18nKeys.SearchAgentSkills),
      loading: t(QuickAppEditorI18nKeys.LoadingSkills),
      failedToLoad: t(QuickAppEditorI18nKeys.FailedToLoadSkills),
      empty: t(QuickAppEditorI18nKeys.NoAgentSkillsAdded),
      selectAll: t(QuickAppEditorI18nKeys.SelectAllSkills),
      selectRow: (name) => t(QuickAppEditorI18nKeys.SelectAddOn, { name }),
    }),
    [t],
  );

  return (
    <AddOnCatalogModal
      type={CatalogEntityType.Skill}
      items={items}
      attachedIds={value}
      initialCheckedIds={value}
      labels={labels}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};
