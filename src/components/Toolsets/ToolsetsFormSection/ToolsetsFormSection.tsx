import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';

import { AddOnRow } from '@/components/AddOns/AddOnRow';
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
  isReadonly: boolean;
  tooltip?: string;
  onChange: (allIds: string[]) => void;
}

/** The Toolsets row of the Add-ons card: the attached toolsets and the Add toolset picker. */
const ToolsetsFormSection: FC<ToolsetsFormSectionProps> = ({
  allIds,
  toolsetIds,
  isReadonly,
  tooltip,
  onChange,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
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
      label={t(QuickAppEditorI18nKeys.Toolsets)}
      emptyDescription={t(QuickAppEditorI18nKeys.ToolsetsDescription)}
      isEmpty={toolsetIds.length === 0}
      isAddDisabled={isReadonly}
      addTooltip={tooltip ?? t(QuickAppEditorI18nKeys.AddToolsets)}
      onAdd={() => setIsAddModalOpen(true)}
    >
      <ToolsetsList ids={toolsetIds} allIds={allIds} isReadonly={isReadonly} onChange={onChange} />

      {isAddModalOpen && !isReadonly && (
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
