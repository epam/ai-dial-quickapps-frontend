import { FC, memo } from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';

import { DialFormItem, NumberInput, TagInput } from '@epam/ai-dial-ui-kit';

export interface UserAttachmentsSectionProps {
  control: Control<QuickApp2FormType>;
  errors: FieldErrors<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
  onAttachmentTypesChange: (tags: string[], prevTags: string[]) => void;
}

const UserAttachmentsSection: FC<UserAttachmentsSectionProps> = ({
  control,
  errors,
  isReadonly,
  tooltip,
  onAttachmentTypesChange,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <FormCollapsibleSection
      name={t(QuickAppEditorI18nKeys.UserAttachments)}
      description={t(QuickAppEditorI18nKeys.UserAttachmentsDescription)}
    >
      <DialFormItem
        label={t(QuickAppEditorI18nKeys.AttachmentTypes)}
        description={t(QuickAppEditorI18nKeys.InputMIMEType)}
      >
        <Controller
          control={control}
          name="inputAttachmentTypes"
          render={({ field }) => (
            <TagInput
              value={field.value}
              onChange={(tags) => onAttachmentTypesChange(tags, field.value)}
              disabled={isReadonly}
              placeholder={t(QuickAppEditorI18nKeys.EnterAttachmentTypes)}
              ariaLabel={t(QuickAppEditorI18nKeys.AttachmentTypes)}
              tagListLabel={t(QuickAppEditorI18nKeys.AttachmentTypes)}
              invalid={!!errors.inputAttachmentTypes}
              error={errors.inputAttachmentTypes?.message}
            />
          )}
        />
      </DialFormItem>

      <DialFormItem
        label={t(QuickAppEditorI18nKeys.MaxAttachmentsNumber)}
        error={errors.maxInputAttachments?.message as string | undefined}
      >
        <Controller
          control={control}
          name="maxInputAttachments"
          render={({ field }) => (
            <NumberInput
              value={field.value?.toString() ?? ''}
              onChange={(value) => {
                field.onChange(value ? Number(value) : '');
              }}
              integer
              min={1}
              disabled={isReadonly}
              title={tooltip}
              placeholder={t(QuickAppEditorI18nKeys.EnterMaxAttachments)}
              invalid={!!errors.maxInputAttachments}
            />
          )}
        />
      </DialFormItem>
    </FormCollapsibleSection>
  );
};

export default memo(UserAttachmentsSection);
