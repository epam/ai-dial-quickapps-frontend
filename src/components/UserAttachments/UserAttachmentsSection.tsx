import { FC, memo } from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';

import { MarketplaceI18nKeys } from '@/constants/i18n';
import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

import { FormCollapsibleSection } from '@/components/common/FormCollapsibleSection';

import { DialTagInput } from '@epam/ai-dial-ui-kit';
import { DialFormItem } from '@epam/ai-dial-ui-kit';
import { DialInput } from '@epam/ai-dial-ui-kit';

export interface UserAttachmentsSectionProps {
  control: Control<QuickApp2FormType>;
  errors: FieldErrors<QuickApp2FormType>;
  isReadonly: boolean;
  tooltip?: string;
  attachmentTypesResetKey: number;
  onAttachmentTypesChange: (tags: string[], prevTags: string[]) => void;
}

const UserAttachmentsSection: FC<UserAttachmentsSectionProps> = ({
  control,
  errors,
  isReadonly,
  tooltip,
  attachmentTypesResetKey,
  onAttachmentTypesChange,
}) => {
  const { t } = useTranslation(Translation.Marketplace);

  return (
    <FormCollapsibleSection
      name={t(MarketplaceI18nKeys.UserAttachments)}
      description={t(MarketplaceI18nKeys.UserAttachmentsDescription)}
    >
      <DialFormItem
        label={t(MarketplaceI18nKeys.AttachmentTypes)}
        description={t(MarketplaceI18nKeys.InputMIMEType)}
      >
        <Controller
          control={control}
          name="inputAttachmentTypes"
          render={({ field }) => (
            <DialTagInput
              key={attachmentTypesResetKey}
              initialTags={field.value}
              onChange={(tags) => onAttachmentTypesChange(tags, field.value)}
              disabled={isReadonly}
              placeholder={t(MarketplaceI18nKeys.EnterAttachmentTypes)}
              invalid={!!errors.inputAttachmentTypes}
              errorText={errors.inputAttachmentTypes?.message}
            />
          )}
        />
      </DialFormItem>

      <DialFormItem
        label={t(MarketplaceI18nKeys.MaxAttachmentsNumber)}
        error={errors.maxInputAttachments?.message as string | undefined}
      >
        <Controller
          control={control}
          name="maxInputAttachments"
          render={({ field }) => (
            <DialInput
              value={field.value?.toString() ?? ''}
              onChange={(value) => {
                field.onChange(value ? Number(value) : undefined);
              }}
              type="number"
              min={1}
              disabled={isReadonly}
              title={tooltip}
              placeholder={t(MarketplaceI18nKeys.EnterMaxAttachments)}
              invalid={!!errors.maxInputAttachments}
            />
          )}
        />
      </DialFormItem>
    </FormCollapsibleSection>
  );
};

export default memo(UserAttachmentsSection);
