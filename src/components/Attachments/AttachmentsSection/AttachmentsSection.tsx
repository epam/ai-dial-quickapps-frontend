import { FC, memo, useCallback, useId } from 'react';

import { ATTACHMENT_TYPE_SUGGESTIONS } from '@/constants/attachment-types';
import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';

import {
  AutocompleteTagInput,
  FormSection,
  FormSectionVariant,
  Switch,
} from '@epam/ai-dial-ui-kit';

export interface AttachmentsSectionProps {
  isEnabled: boolean;
  value: string[];
  error?: string;
  onEnabledChange: (isEnabled: boolean) => void;
  onChange: (mimeTypes: string[]) => void;
}

const AttachmentsSection: FC<AttachmentsSectionProps> = ({
  isEnabled,
  value,
  error,
  onEnabledChange,
  onChange,
}) => {
  const { t } = useTranslation();
  const inputId = useId();

  const getRemoveTagLabel = useCallback(
    (type: string) => t(ApplicationEditorI18nKeys.AttachmentsRemoveType, { type }),
    [t],
  );

  return (
    <FormSection
      title={t(ApplicationEditorI18nKeys.AttachmentsTitle)}
      description={t(ApplicationEditorI18nKeys.AttachmentsDescription)}
      variant={FormSectionVariant.Setting}
      action={
        <Switch
          isOn={isEnabled}
          onChange={onEnabledChange}
          aria-label={t(ApplicationEditorI18nKeys.AttachmentsTitle)}
        />
      }
    >
      {isEnabled ? (
        <AutocompleteTagInput
          id={inputId}
          suggestions={ATTACHMENT_TYPE_SUGGESTIONS}
          value={value}
          onChange={onChange}
          labelProps={{ label: t(ApplicationEditorI18nKeys.AttachmentsTypesLabel), required: true }}
          placeholder={t(ApplicationEditorI18nKeys.AttachmentsTypesPlaceholder)}
          error={error ? t(error as ApplicationEditorI18nKeys) : undefined}
          invalid={!!error}
          tagListLabel={t(ApplicationEditorI18nKeys.AttachmentsTypesLabel)}
          getRemoveTagLabel={getRemoveTagLabel}
        />
      ) : undefined}
    </FormSection>
  );
};

export default memo(AttachmentsSection);
