import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import type { QuickApp2FormValues } from '@/types/quick-app-form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { AddOnRow } from '@/components/AddOns/AddOnRow';
import SkillsList from '@/components/Skills/SkillsList/SkillsList';

// The picker brings in the catalog list (ag-grid + @epam/ai-dial-catalog),
// so it loads on first open instead of with the editor.
const AddSkillsModal = lazy(async () => ({
  default: (await import('@/components/Skills/AddSkillsModal/AddSkillsModal')).AddSkillsModal,
}));

export interface AgentSkillsFormSectionProps {
  value: QuickApp2FormValues['agentSkills'];
  onChange: (value: QuickApp2FormValues['agentSkills']) => void;
  isReadonly: boolean;
  tooltip?: string;
}

const AgentSkillsFormSection: FC<AgentSkillsFormSectionProps> = ({
  value,
  onChange,
  isReadonly,
  tooltip,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
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
      label={t(QuickAppEditorI18nKeys.Skills)}
      emptyDescription={t(QuickAppEditorI18nKeys.AgentSkillsDescription)}
      isEmpty={!value?.length}
      isAddDisabled={isReadonly}
      addTooltip={tooltip ?? t(QuickAppEditorI18nKeys.AddAgentSkills)}
      onAdd={() => setIsSkillsModalOpen(true)}
    >
      <SkillsList value={value} isReadonly={isReadonly} onRemove={handleRemove} />

      {isSkillsModalOpen && !isReadonly && (
        <Suspense fallback={null}>
          <AddSkillsModal value={value} onClose={handleCloseModal} onConfirm={handleConfirm} />
        </Suspense>
      )}
    </AddOnRow>
  );
};

export default memo(AgentSkillsFormSection);
