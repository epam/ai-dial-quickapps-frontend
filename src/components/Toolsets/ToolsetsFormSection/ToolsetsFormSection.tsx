import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';

import { AddOnRow } from '@/components/AddOns/AddOnRow/AddOnRow';
import ToolsetsList from '@/components/Toolsets/ToolsetsList/ToolsetsList';

// The picker brings in the catalog list (ag-grid + @epam/ai-dial-catalog),
// so it loads on first open instead of with the editor.
const AddToolsetsModal = lazy(async () => ({
  default: (await import('@/components/Toolsets/AddToolsetsModal/AddToolsetsModal'))
    .AddToolsetsModal,
}));

export interface ToolsetsFormSectionProps {
  /** Every `addOns` id, in order. */
  allIds: string[];
  /** The toolset entries among them. */
  toolsetIds: string[];
  onChange: (allIds: string[]) => void;
}

/** The Toolsets row of the Add-ons card: the attached toolsets and the Add toolset picker. */
const ToolsetsFormSection: FC<ToolsetsFormSectionProps> = ({ allIds, toolsetIds, onChange }) => {
  const { t } = useTranslation();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleCloseModal = useCallback(() => setIsAddModalOpen(false), []);

  const handleConfirm = useCallback(
    (ids: string[]) => {
      onChange(ids);
      setIsAddModalOpen(false);
    },
    [onChange],
  );

  return (
    <AddOnRow
      label={t(ApplicationEditorI18nKeys.ToolsetsTitle)}
      emptyDescription={t(ApplicationEditorI18nKeys.ToolsetsDescription)}
      isEmpty={toolsetIds.length === 0}
      addTooltip={t(ApplicationEditorI18nKeys.ToolsetsAddMany)}
      onAdd={() => setIsAddModalOpen(true)}
    >
      <ToolsetsList ids={toolsetIds} allIds={allIds} onChange={onChange} />

      {isAddModalOpen && (
        <Suspense fallback={null}>
          <AddToolsetsModal
            allIds={allIds}
            toolsetIds={toolsetIds}
            onClose={handleCloseModal}
            onConfirm={handleConfirm}
          />
        </Suspense>
      )}
    </AddOnRow>
  );
};

export default memo(ToolsetsFormSection);
