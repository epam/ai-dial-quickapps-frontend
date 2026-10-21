import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import type { QuickApp2FormValues } from '@/types/quick-app-form';
import { useTranslation } from 'react-i18next';

import { AddOnRow } from '@/components/AddOns/AddOnRow/AddOnRow';
import SkillsList from '@/components/Skills/SkillsList/SkillsList';

// The picker brings in the catalog list (ag-grid + @epam/ai-dial-catalog),
// so it loads on first open instead of with the editor.
const AddSkillsModal = lazy(async () => ({
  default: (await import('@/components/Skills/AddSkillsModal/AddSkillsModal')).AddSkillsModal,
}));

export interface AgentSkillsFormSectionProps {
  value: QuickApp2FormValues['agentSkills'];
  onChange: (value: QuickApp2FormValues['agentSkills']) => void;
}

const AgentSkillsFormSection: FC<AgentSkillsFormSectionProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

  const handleRemove = useCallback(
    (idToRemove: string) => onChange(value.filter((id) => id !== idToRemove)),
    [onChange, value],
  );

  const handleCloseModal = useCallback(() => setIsSkillsModalOpen(false), []);

  const handleConfirm = useCallback(
    (ids: string[]) => {
      onChange(ids);
      setIsSkillsModalOpen(false);
    },
    [onChange],
  );

  return (
    <AddOnRow
      label={t(ApplicationEditorI18nKeys.SkillsTitle)}
      emptyDescription={t(ApplicationEditorI18nKeys.SkillsDescription)}
      isEmpty={!value?.length}
      addTooltip={t(ApplicationEditorI18nKeys.SkillsAddMany)}
      onAdd={() => setIsSkillsModalOpen(true)}
    >
      <SkillsList value={value} onRemove={handleRemove} />

      {isSkillsModalOpen && (
        <Suspense fallback={null}>
          <AddSkillsModal value={value} onClose={handleCloseModal} onConfirm={handleConfirm} />
        </Suspense>
      )}
    </AddOnRow>
  );
};

export default memo(AgentSkillsFormSection);
