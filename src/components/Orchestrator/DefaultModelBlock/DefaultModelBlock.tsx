import { FC, lazy, Suspense, useCallback, useState } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/use-translation';
import { LoadStatus } from '@/types/load-status';
import { SectionRowVariant } from '@/types/section-row';
import { Translation } from '@/types/translation';
import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
  NeutralButton,
} from '@epam/ai-dial-ui-kit';
import { IconPencil } from '@tabler/icons-react';

import { SectionRow } from '@/components/common/SectionRow/SectionRow';
import { SelectedModelCard } from '@/components/Orchestrator/SelectedModelCard/SelectedModelCard';

// The picker brings in the catalog list (ag-grid + @epam/ai-dial-catalog),
// so it loads on first open instead of with the editor.
const ModelCatalogModal = lazy(async () => ({
  default: (await import('@/components/Orchestrator/ModelCatalogModal/ModelCatalogModal'))
    .ModelCatalogModal,
}));

interface DefaultModelBlockProps {
  value: string;
  onChange: (modelId: string) => void;
  isDisabled?: boolean;
  tooltip?: string;
  error?: string;
}

export const DefaultModelBlock: FC<DefaultModelBlockProps> = ({
  value,
  onChange,
  isDisabled,
  tooltip,
  error,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { modelsMap, status } = useDataContext();
  const [isOpen, setIsOpen] = useState(false);

  // `modelsMap` holds models and applications, so a saved application still
  // shows on the card even though the picker offers only models.
  const selectedModel = modelsMap[value];
  const isLoading =
    (status === LoadStatus.Loading || status === LoadStatus.Idle) && selectedModel == null;

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);
  const handleConfirm = useCallback(
    (modelId: string) => {
      onChange(modelId);
      setIsOpen(false);
    },
    [onChange],
  );

  return (
    <SectionRow
      title={t(QuickAppEditorI18nKeys.DefaultModel)}
      variant={SectionRowVariant.Caption}
      action={
        <NeutralButton
          size={ElementSize.Small}
          iconBefore={
            <IconPencil size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} aria-hidden="true" />
          }
          label={t(QuickAppEditorI18nKeys.Change)}
          onClick={handleOpen}
          disabled={isDisabled || isLoading}
          tooltipProps={tooltip ? { tooltip } : undefined}
        />
      }
    >
      <div title={tooltip}>
        <SelectedModelCard
          modelId={value}
          model={selectedModel}
          isLoading={isLoading}
          isDisabled={isDisabled}
          error={error}
        />
      </div>

      {isOpen && (
        <Suspense fallback={null}>
          <ModelCatalogModal value={value} onConfirm={handleConfirm} onClose={handleClose} />
        </Suspense>
      )}
    </SectionRow>
  );
};
