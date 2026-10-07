import { FC, useEffect, useRef } from 'react';
import isEqual from 'lodash-es/isEqual';
import { useForm, useWatch } from 'react-hook-form';

import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import type { QuickApp2FormValues } from '@/types/quick-app-form';

import ContextAndToolsSection from '../ContextAndTools/ContextAndToolsSection';
import ConversationStartersSection from '../ConversationStarters/ConversationStartersSection';

const LEGACY_FIELDS = [
  'documentRelativeUrl',
  'codeInterpreter',
  'addAttachment',
  'webFetch',
  'starters',
  'introText',
  'autoSubmit',
  'chatMessageInputDisabled',
] as const;

export interface QuickApp2FormLegacyFieldsProps {
  values: QuickApp2FormValues;
  isReadonly: boolean;
  tooltip?: string;
  isCodeInterpreterEnabled: boolean;
  isWebFetchEnabled: boolean;
  isAddAttachmentEnabled: boolean;
  startersSettingsTooltip?: string;
  onValuesChange: (values: Partial<QuickApp2FormValues>) => void;
}

const QuickApp2FormLegacyFields: FC<QuickApp2FormLegacyFieldsProps> = ({
  values,
  isReadonly,
  tooltip,
  isCodeInterpreterEnabled,
  isWebFetchEnabled,
  isAddAttachmentEnabled,
  startersSettingsTooltip,
  onValuesChange,
}) => {
  const { control, setValue } = useForm<QuickApp2FormType>({
    defaultValues: values as QuickApp2FormType,
    mode: 'onChange',
  });
  const legacyValues = useWatch({ control }) as unknown as QuickApp2FormValues;
  const previousValuesPropRef = useRef(values);
  const previousLegacyValuesRef = useRef(legacyValues);

  useEffect(() => {
    const previousValues = previousValuesPropRef.current;
    if (isEqual(previousValues, values)) return;
    previousValuesPropRef.current = values;

    for (const field of LEGACY_FIELDS) {
      if (!isEqual(legacyValues[field], values[field])) {
        setValue(
          field as keyof QuickApp2FormType,
          values[field] as never,
          { shouldDirty: false, shouldValidate: false },
        );
      }
    }
  }, [legacyValues, setValue, values]);

  useEffect(() => {
    const previousValues = previousLegacyValuesRef.current;
    const changedValues: Partial<QuickApp2FormValues> = {};
    let hasChanges = false;

    for (const field of LEGACY_FIELDS) {
      if (!isEqual(legacyValues[field], previousValues[field])) {
        changedValues[field] = legacyValues[field] as never;
        hasChanges = true;
      }
    }

    previousLegacyValuesRef.current = legacyValues;
    if (hasChanges) onValuesChange(changedValues);
  }, [legacyValues, onValuesChange]);

  const hasStarters = values.starters.some((starter) => starter.title.trim() && starter.text.trim());


  return (
    <>
      <ContextAndToolsSection
        control={control}
        isReadonly={isReadonly}
        tooltip={tooltip}
        isCodeInterpreterEnabled={isCodeInterpreterEnabled}
        isWebFetchEnabled={isWebFetchEnabled}
        isAddAttachmentEnabled={isAddAttachmentEnabled}
      />

      <hr className="border-secondary" />

      <ConversationStartersSection
        control={control}
        isReadonly={isReadonly}
        hasStarters={hasStarters}
        startersSettingsTooltip={startersSettingsTooltip}
      />
    </>
  );
};

export default QuickApp2FormLegacyFields;
