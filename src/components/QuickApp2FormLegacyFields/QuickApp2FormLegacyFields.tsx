import { FC, ReactNode, useEffect, useMemo, useRef } from 'react';
import isEqual from 'lodash-es/isEqual';
import { useForm, useWatch, type FieldErrors } from 'react-hook-form';

import { QuickApp2Form as QuickApp2FormType } from '@/form/quickApp2Form';
import type { QuickApp2FormErrors, QuickApp2FormValues } from '@/types/quick-app-form';
import type { AnyToolset, DialAppTransportType } from '@/types/quick-apps';

import ContextAndToolsSection from '../ContextAndTools/ContextAndToolsSection';
import ConversationStartersSection from '../ConversationStarters/ConversationStartersSection';
import UserAttachmentsSection from '../UserAttachments/UserAttachmentsSection';

const LEGACY_FIELDS = [
  'documentRelativeUrl',
  'agentsAndToolsets',
  'codeInterpreter',
  'agentsAndToolsetsJson',
  'isJsonView',
  'fileTools',
  'addAttachment',
  'webFetch',
  'starters',
  'introText',
  'autoSubmit',
  'chatMessageInputDisabled',
  'inputAttachmentTypes',
  'maxInputAttachments',
] as const;

export interface QuickApp2FormLegacyFieldsProps {
  values: QuickApp2FormValues;
  errors: QuickApp2FormErrors;
  isReadonly: boolean;
  tooltip?: string;
  isCodeInterpreterEnabled: boolean;
  isWebFetchEnabled: boolean;
  isAddAttachmentEnabled: boolean;
  attachmentTypesResetKey: number;
  agentSkills: ReactNode;
  startersSettingsTooltip?: string;
  onValuesChange: (values: Partial<QuickApp2FormValues>) => void;
  onAttachmentTypesChange: (tags: string[], previousTags: string[]) => void;
  onAgentsChange: (ids: string[]) => void;
  onJsonChange: (json: string) => void;
  onSwitchToJsonView: () => void;
  onSwitchToSimpleView: (toolsets: AnyToolset[]) => void;
  onDiscardJson: () => void;
  onConfigureAgent: (id: string, transport: DialAppTransportType) => void;
}

const QuickApp2FormLegacyFields: FC<QuickApp2FormLegacyFieldsProps> = ({
  values,
  errors,
  isReadonly,
  tooltip,
  isCodeInterpreterEnabled,
  isWebFetchEnabled,
  isAddAttachmentEnabled,
  attachmentTypesResetKey,
  agentSkills,
  startersSettingsTooltip,
  onValuesChange,
  onAttachmentTypesChange,
  onAgentsChange,
  onJsonChange,
  onSwitchToJsonView,
  onSwitchToSimpleView,
  onDiscardJson,
  onConfigureAgent,
}) => {
  const { control, setValue, formState } = useForm<QuickApp2FormType>({
    defaultValues: values as QuickApp2FormType,
    mode: 'onChange',
  });
  const legacyValues = useWatch({ control }) as unknown as QuickApp2FormValues;
  const previousValuesPropRef = useRef(values);
  const previousLegacyValuesRef = useRef(legacyValues);
  const legacyErrors = formState.errors as FieldErrors<QuickApp2FormType>;

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

  const contextErrors = useMemo<FieldErrors<QuickApp2FormType>>(() => {
    const nextErrors = { ...legacyErrors };
    const message = errors.agentsAndToolsetsJson;
    if (message) {
      nextErrors.agentsAndToolsetsJson = { type: 'manual', message };
    } else {
      delete nextErrors.agentsAndToolsetsJson;
    }
    return nextErrors;
  }, [errors.agentsAndToolsetsJson, legacyErrors]);

  const attachmentErrors = useMemo<FieldErrors<QuickApp2FormType>>(() => {
    const nextErrors = { ...legacyErrors };
    const attachmentTypesMessage = errors.inputAttachmentTypes;
    const maxAttachmentsMessage = errors.maxInputAttachments;
    if (attachmentTypesMessage) {
      nextErrors.inputAttachmentTypes = { type: 'manual', message: attachmentTypesMessage };
    } else {
      delete nextErrors.inputAttachmentTypes;
    }
    if (maxAttachmentsMessage) {
      nextErrors.maxInputAttachments = { type: 'manual', message: maxAttachmentsMessage };
    } else {
      delete nextErrors.maxInputAttachments;
    }
    return nextErrors;
  }, [errors.inputAttachmentTypes, errors.maxInputAttachments, legacyErrors]);

  return (
    <>
      <ContextAndToolsSection
        control={control}
        errors={contextErrors}
        isReadonly={isReadonly}
        tooltip={tooltip}
        isCodeInterpreterEnabled={isCodeInterpreterEnabled}
        isWebFetchEnabled={isWebFetchEnabled}
        isAddAttachmentEnabled={isAddAttachmentEnabled}
        agentsAndToolsets={values.agentsAndToolsets}
        agentsAndToolsetsJson={values.agentsAndToolsetsJson}
        isJsonView={values.isJsonView}
        onAgentsChange={onAgentsChange}
        onJsonChange={onJsonChange}
        onSwitchToJsonView={onSwitchToJsonView}
        onSwitchToSimpleView={onSwitchToSimpleView}
        onDiscardJson={onDiscardJson}
        onConfigureAgent={onConfigureAgent}
      />

      <hr className="border-secondary" />

      {agentSkills}

      <hr className="border-secondary" />

      <UserAttachmentsSection
        control={control}
        errors={attachmentErrors}
        isReadonly={isReadonly}
        tooltip={tooltip}
        attachmentTypesResetKey={attachmentTypesResetKey}
        onAttachmentTypesChange={onAttachmentTypesChange}
      />

      <hr className="border-secondary" />

      <ConversationStartersSection
        control={control}
        isReadonly={isReadonly}
        hasStarters={hasStarters}
        startersSettingsTooltip={startersSettingsTooltip}
        autoSubmit={values.autoSubmit}
        chatMessageInputDisabled={values.chatMessageInputDisabled}
      />
    </>
  );
};

export default QuickApp2FormLegacyFields;
