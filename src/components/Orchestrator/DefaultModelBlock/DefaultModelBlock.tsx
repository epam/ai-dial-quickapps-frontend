import { FC, lazy, Suspense, useCallback, useMemo, useState } from 'react';

import { ApplicationEditorI18nKeys, ButtonsI18nKeys } from '@/constants/translation-keys';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from 'react-i18next';
import { LoadStatus } from '@/types/load-status';
import { getLocalizedText } from '@/utils/get-localized-text';
import { resolveIconUrl } from '@/utils/resolve-icon-url';
import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
  type EntityIdentityItem,
  EntityType,
  FormSection,
  FormSectionVariant,
  NeutralButton,
  SelectedEntityCard,
} from '@epam/ai-dial-ui-kit';
import { IconPencil } from '@tabler/icons-react';

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
  error?: string;
}

export const DefaultModelBlock: FC<DefaultModelBlockProps> = ({
  value,
  onChange,
  isDisabled,
  error,
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { modelsMap, status } = useDataContext();
  const [isOpen, setIsOpen] = useState(false);

  // `modelsMap` holds models and applications, so a saved application still
  // shows on the card even though the picker offers only models.
  const selectedModel = modelsMap[value];
  const isLoading =
    (status === LoadStatus.Loading || status === LoadStatus.Idle) && selectedModel == null;

  // Every selection, a saved application included, is labelled as a model.
  const selectedItem = useMemo<EntityIdentityItem | undefined>(
    () =>
      selectedModel && {
        type: EntityType.Model,
        name: getLocalizedText(selectedModel.name, language, selectedModel.id),
        version: selectedModel.version,
        iconUrl: selectedModel.iconUrl ? resolveIconUrl(selectedModel.iconUrl) : undefined,
      },
    [language, selectedModel],
  );

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
    <FormSection
      title={t(ApplicationEditorI18nKeys.OrchestratorDefaultModel)}
      variant={FormSectionVariant.Caption}
      titleClassName="text-secondary"
      action={
        <NeutralButton
          size={ElementSize.Small}
          iconBefore={
            <IconPencil size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} aria-hidden="true" />
          }
          label={t(ButtonsI18nKeys.Change)}
          onClick={handleOpen}
          disabled={isDisabled || isLoading}
        />
      }
    >
      <SelectedEntityCard
        entityId={value}
        item={selectedItem}
        isLoading={isLoading}
        isDisabled={isDisabled}
        error={error}
        labels={{
          type: t(ApplicationEditorI18nKeys.OrchestratorModel),
          placeholder: t(ApplicationEditorI18nKeys.OrchestratorSelectModel),
        }}
      />

      {isOpen && (
        <Suspense fallback={null}>
          <ModelCatalogModal value={value} onConfirm={handleConfirm} onClose={handleClose} />
        </Suspense>
      )}
    </FormSection>
  );
};
