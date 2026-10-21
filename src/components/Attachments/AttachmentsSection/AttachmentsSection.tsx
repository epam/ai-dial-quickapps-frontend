import { FC, memo, useCallback, useId } from 'react';

import { ATTACHMENT_TYPE_SUGGESTIONS } from '@/constants/attachment-types';
import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';
import { SectionRowVariant } from '@/types/section-row';

import { SectionRow } from '@/components/common/SectionRow/SectionRow';

import { AutocompleteTagInput, Switch } from '@epam/ai-dial-ui-kit';

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
    <SectionRow
      title={t(ApplicationEditorI18nKeys.AttachmentsTitle)}
      description={t(ApplicationEditorI18nKeys.AttachmentsDescription)}
      variant={SectionRowVariant.Setting}
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
    </SectionRow>
  );
};

export default memo(AttachmentsSection);
