import { FC, memo, useCallback, useId } from 'react';

import { ATTACHMENT_TYPE_SUGGESTIONS } from '@/constants/attachment-types';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { SectionRowVariant } from '@/types/section-row';
import { Translation } from '@/types/translation';

import { SectionRow } from '@/components/common/SectionRow/SectionRow';

import { AutocompleteTagInput, Switch } from '@epam/ai-dial-ui-kit';

export interface AttachmentsSectionProps {
  isEnabled: boolean;
  value: string[];
  error?: string;
  isReadonly: boolean;
  onEnabledChange: (isEnabled: boolean) => void;
  onChange: (mimeTypes: string[]) => void;
}

const AttachmentsSection: FC<AttachmentsSectionProps> = ({
  isEnabled,
  value,
  error,
  isReadonly,
  onEnabledChange,
  onChange,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const inputId = useId();

  const getRemoveTagLabel = useCallback(
    (type: string) => t(QuickAppEditorI18nKeys.RemoveAttachmentType, { type }),
    [t],
  );

  return (
    <SectionRow
      title={t(QuickAppEditorI18nKeys.Attachments)}
      description={t(QuickAppEditorI18nKeys.AttachmentsDescription)}
      variant={SectionRowVariant.Setting}
      action={
        <Switch
          isOn={isEnabled}
          disabled={isReadonly}
          onChange={onEnabledChange}
          aria-label={t(QuickAppEditorI18nKeys.Attachments)}
        />
      }
    >
      {isEnabled ? (
        <AutocompleteTagInput
          id={inputId}
          suggestions={ATTACHMENT_TYPE_SUGGESTIONS}
          value={value}
          onChange={onChange}
          labelProps={{ label: t(QuickAppEditorI18nKeys.AttachmentTypes), required: true }}
          placeholder={t(QuickAppEditorI18nKeys.EnterAttachmentTypes)}
          error={error ? t(error) : undefined}
          invalid={!!error}
          disabled={isReadonly}
          tagListLabel={t(QuickAppEditorI18nKeys.AttachmentTypes)}
          getRemoveTagLabel={getRemoveTagLabel}
          // ui-kit's list `flex` class overrides its `hidden` attribute, leaving an empty
          // surface under the input. Remove once the ui-kit fix is released.
          listClassName="[&[hidden]]:hidden"
        />
      ) : undefined}
    </SectionRow>
  );
};

export default memo(AttachmentsSection);
