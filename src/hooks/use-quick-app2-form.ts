import { useCallback, useMemo, useReducer } from 'react';
import isEqual from 'lodash-es/isEqual';
import { nanoid } from 'nanoid';

import {
  AgentOrToolsetSchemaKeys,
  MIME_TYPE_REGEX,
  QuickApp2Schema,
  getAgentsAndToolsetsFormValue,
  getQuickApp2Toolsets,
  resolveDefaultModelId,
  type QuickApp2Form,
} from '@/form/quickApp2Form';
import { decodeFileUrl } from '@/utils/decode-file-url';
import {
  QuickApp2ModelStatus,
  type QuickApp2FormErrors,
  type QuickApp2FormExternalState,
  type QuickApp2FormUpdateOptions,
  type QuickApp2FormValidationResult,
  type QuickApp2FormValues,
} from '@/types/quick-app-form';
import { ToolsetTypes } from '@/constants/quick-apps';
import type { AnyToolset, DialAppTransportType } from '@/types/quick-apps';

type AllEntitiesMap = Parameters<typeof getQuickApp2Toolsets>[0]['allEntitiesMap'];
type StarterField = 'title' | 'text';

type FormAction =
  | {
      type: 'SET_FIELD';
      field: keyof QuickApp2FormValues;
      value: QuickApp2FormValues[keyof QuickApp2FormValues];
      options: QuickApp2FormUpdateOptions;
    }
  | {
      type: 'SET_VALUES';
      values: Partial<QuickApp2FormValues>;
      options: QuickApp2FormUpdateOptions;
    }
  | {
      type: 'SYNC_EXTERNAL';
      externalState: QuickApp2FormExternalState;
    }
  | { type: 'SET_ERRORS'; errors: QuickApp2FormErrors }
  | { type: 'CLEAR_ERROR'; path: string }
  | { type: 'RESET' }
  | { type: 'SET_AGENT_IDS'; ids: string[] }
  | { type: 'CONFIGURE_AGENT'; id: string; transport: DialAppTransportType }
  | { type: 'UPDATE_STARTER'; index: number; field: StarterField; value: string }
  | { type: 'REMOVE_STARTER'; index: number }
  | { type: 'ADD_DOCUMENTS'; documents: string[] }
  | { type: 'REMOVE_DOCUMENT'; document: string }
  | { type: 'SET_ATTACHMENT_TYPES'; tags: string[]; previousTags: string[]; invalidMessage: string }
  | { type: 'SET_ATTACHMENT_RESET_KEY'; value: number };

interface FormState {
  values: QuickApp2FormValues;
  initialValues: QuickApp2FormValues;
  errors: QuickApp2FormErrors;
  attachmentTypesResetKey: number;
  modelStatus: QuickApp2ModelStatus;
}

export interface UseQuickApp2FormOptions {
  defaultValues: QuickApp2FormValues;
}

export interface UseQuickApp2FormResult {
  values: QuickApp2FormValues;
  errors: QuickApp2FormErrors;
  isDirty: boolean;
  isModelReady: boolean;
  attachmentTypesResetKey: number;
  setField: <K extends keyof QuickApp2FormValues>(
    field: K,
    value: QuickApp2FormValues[K],
    options?: QuickApp2FormUpdateOptions,
  ) => void;
  setValues: (values: Partial<QuickApp2FormValues>, options?: QuickApp2FormUpdateOptions) => void;
  syncExternalState: (externalState: QuickApp2FormExternalState) => void;
  validate: () => QuickApp2FormValidationResult;
  submit: () => QuickApp2FormValidationResult;
  clearError: (path: string) => void;
  reset: () => void;
  setAgentIds: (ids: string[]) => void;
  configureAgent: (id: string, transport: DialAppTransportType) => void;
  switchToJsonView: (allEntitiesMap: AllEntitiesMap, language: string) => void;
  switchToSimpleView: (toolsets: AnyToolset[]) => void;
  discardJson: (allEntitiesMap: AllEntitiesMap, language: string) => void;
  updateStarter: (index: number, field: StarterField, value: string) => void;
  removeStarter: (index: number) => void;
  addDocuments: (documents: string[]) => void;
  removeDocument: (document: string) => void;
  setAttachmentTypes: (tags: string[], previousTags: string[], invalidMessage: string) => void;
  setAttachmentTypesResetKey: (value: number) => void;
}

const getErrorPath = (path: PropertyKey[]): string =>
  path.reduce<string>((result, part) => {
    if (typeof part === 'number') return `${result}[${part}]`;
    const key = String(part);
    return result ? `${result}.${key}` : key;
  }, '');

export const getQuickApp2FormErrors = (value: unknown): QuickApp2FormErrors => {
  const result = QuickApp2Schema.safeParse(value);
  if (result.success) return {};

  return result.error.issues.reduce<QuickApp2FormErrors>((errors, issue) => {
    const path = getErrorPath(issue.path);
    if (errors[path] == null) errors[path] = issue.message;
    return errors;
  }, {});
};

const getValidatedResult = (values: QuickApp2FormValues): QuickApp2FormValidationResult => {
  const result = QuickApp2Schema.safeParse(values);
  if (result.success) return { isValid: true, data: result.data };
  return { isValid: false, errors: getQuickApp2FormErrors(values) };
};

const applyValues = (
  state: FormState,
  values: Partial<QuickApp2FormValues>,
  options: QuickApp2FormUpdateOptions,
): FormState => {
  const nextValues = { ...state.values, ...values };
  const nextInitialValues =
    options.shouldDirty === false ? { ...state.initialValues, ...values } : state.initialValues;
  const nextErrors = options.shouldValidate ? getQuickApp2FormErrors(nextValues) : state.errors;

  return { ...state, values: nextValues, initialValues: nextInitialValues, errors: nextErrors };
};

const reduceFormState = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case 'SET_FIELD':
      return applyValues(state, { [action.field]: action.value }, action.options);
    case 'SET_VALUES':
      return applyValues(state, action.values, action.options);
    case 'SYNC_EXTERNAL': {
      const { externalState } = action;
      const values: Partial<QuickApp2FormValues> = {};
      const initialValues: Partial<QuickApp2FormValues> = {};
      if (externalState.toolSupportingModelIds != null) {
        values.toolSupportingModelIds = externalState.toolSupportingModelIds;
        initialValues.toolSupportingModelIds = externalState.toolSupportingModelIds;
      }
      if (externalState.availableModelIds != null) {
        values.availableModelIds = externalState.availableModelIds;
        initialValues.availableModelIds = externalState.availableModelIds;
      }
      const resolvedModel = resolveDefaultModelId(
        externalState.existingModelId,
        externalState.toolSupportingModelIds,
        externalState.availableModelIds,
        externalState.defaultModelId,
      );

      if (!state.values.model && resolvedModel) {
        values.model = resolvedModel;
        initialValues.model = resolvedModel;
      }
      if (!externalState.isCodeInterpreterEnabled) {
        values.codeInterpreter = false;
        initialValues.codeInterpreter = false;
      }
      if (!externalState.isWebFetchEnabled) {
        values.webFetch = false;
        initialValues.webFetch = false;
      }
      if (!externalState.isAddAttachmentEnabled) {
        values.addAttachment = false;
        initialValues.addAttachment = false;
      }

      const nextValues = { ...state.values, ...values };
      const nextErrors = externalState.shouldValidate
        ? getQuickApp2FormErrors(nextValues)
        : state.errors;

      return {
        ...state,
        values: nextValues,
        initialValues: { ...state.initialValues, ...initialValues },
        errors: nextErrors,
        modelStatus: externalState.modelStatus,
      };
    }
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'CLEAR_ERROR': {
      const errors = { ...state.errors };
      delete errors[action.path];
      return { ...state, errors };
    }
    case 'RESET':
      return {
        ...state,
        values: state.initialValues,
        errors: {},
        attachmentTypesResetKey: state.attachmentTypesResetKey + 1,
      };
    case 'SET_AGENT_IDS': {
      const currentValues = new Map(
        state.values.agentsAndToolsets.map((item) => [item[AgentOrToolsetSchemaKeys.id], item]),
      );
      const nextValues = action.ids.map(
        (id) => currentValues.get(id) ?? { [AgentOrToolsetSchemaKeys.id]: id },
      );
      return applyValues(
        state,
        { agentsAndToolsets: nextValues as QuickApp2FormValues['agentsAndToolsets'] },
        { shouldValidate: true },
      );
    }
    case 'CONFIGURE_AGENT': {
      const nextValues = state.values.agentsAndToolsets.map((item) => {
        if (item[AgentOrToolsetSchemaKeys.id] !== action.id) return item;
        return {
          ...item,
          [AgentOrToolsetSchemaKeys.tool]: {
            ...(item[AgentOrToolsetSchemaKeys.tool] ?? {}),
            transport: action.transport,
          },
        };
      });
      return applyValues(
        state,
        { agentsAndToolsets: nextValues as QuickApp2FormValues['agentsAndToolsets'] },
        { shouldValidate: true },
      );
    }
    case 'UPDATE_STARTER': {
      const updated = state.values.starters.map((starter, index) =>
        index === action.index
          ? { ...starter, [action.field]: action.value.length === 1 ? action.value.trim() : action.value }
          : starter,
      );
      const updatedItem = updated[action.index];
      const isLastRow = action.index === updated.length - 1;
      const starters =
        isLastRow && (updatedItem.title.trim() || updatedItem.text.trim())
          ? [...updated, { id: nanoid(), title: '', text: '' }]
          : updated;
      return applyValues(state, { starters }, { shouldValidate: true });
    }
    case 'REMOVE_STARTER':
      if (action.index === state.values.starters.length - 1) return state;
      return applyValues(
        state,
        { starters: state.values.starters.filter((_, index) => index !== action.index) },
        { shouldValidate: true },
      );
    case 'ADD_DOCUMENTS': {
      const existing = new Set(state.values.documentRelativeUrl);
      const documents = action.documents
        .map(decodeFileUrl)
        .filter((document) => !existing.has(document));
      return applyValues(
        state,
        { documentRelativeUrl: [...state.values.documentRelativeUrl, ...documents] },
        { shouldValidate: true },
      );
    }
    case 'REMOVE_DOCUMENT':
      return applyValues(
        state,
        {
          documentRelativeUrl: state.values.documentRelativeUrl.filter(
            (document) => document !== action.document,
          ),
        },
        { shouldValidate: true },
      );
    case 'SET_ATTACHMENT_TYPES': {
      const addedTags = action.tags.filter((tag) => !action.previousTags.includes(tag));
      if (addedTags.some((tag) => !MIME_TYPE_REGEX.test(tag))) {
        return {
          ...state,
          errors: { ...state.errors, inputAttachmentTypes: action.invalidMessage },
          attachmentTypesResetKey: state.attachmentTypesResetKey + 1,
        };
      }
      const errors = { ...state.errors };
      delete errors.inputAttachmentTypes;
      return applyValues(
        { ...state, errors },
        { inputAttachmentTypes: action.tags },
        { shouldValidate: true },
      );
    }
    case 'SET_ATTACHMENT_RESET_KEY':
      return { ...state, attachmentTypesResetKey: action.value };
    default:
      return state;
  }
};

export const useQuickApp2Form = ({ defaultValues }: UseQuickApp2FormOptions): UseQuickApp2FormResult => {
  const [state, dispatch] = useReducer(
    reduceFormState,
    defaultValues,
    (values): FormState => ({
      values,
      initialValues: values,
      errors: {},
      attachmentTypesResetKey: 0,
      modelStatus: QuickApp2ModelStatus.Idle,
    }),
  );

  const setField = useCallback(
    <K extends keyof QuickApp2FormValues>(
      field: K,
      value: QuickApp2FormValues[K],
      options: QuickApp2FormUpdateOptions = { shouldValidate: true },
    ) => {
      dispatch({ type: 'SET_FIELD', field, value, options });
    },
    [],
  );
  const setValues = useCallback(
    (
      values: Partial<QuickApp2FormValues>,
      options: QuickApp2FormUpdateOptions = { shouldValidate: true },
    ) => dispatch({ type: 'SET_VALUES', values, options }),
    [],
  );
  const syncExternalState = useCallback(
    (externalState: QuickApp2FormExternalState) => dispatch({ type: 'SYNC_EXTERNAL', externalState }),
    [],
  );
  const validate = useCallback(() => {
    const result = getValidatedResult(state.values);
    dispatch({ type: 'SET_ERRORS', errors: result.isValid ? {} : result.errors });
    return result;
  }, [state.values]);
  const submit = useCallback(() => validate(), [validate]);
  const clearError = useCallback((path: string) => dispatch({ type: 'CLEAR_ERROR', path }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
  const setAgentIds = useCallback((ids: string[]) => dispatch({ type: 'SET_AGENT_IDS', ids }), []);
  const configureAgent = useCallback(
    (id: string, transport: DialAppTransportType) =>
      dispatch({ type: 'CONFIGURE_AGENT', id, transport }),
    [],
  );
  const switchToJsonView = useCallback(
    (allEntitiesMap: AllEntitiesMap, language: string) => {
      const agentsAndToolsetsJson = JSON.stringify(
        getQuickApp2Toolsets({ data: state.values as QuickApp2Form, allEntitiesMap, language }),
        null,
        2,
      );
      dispatch({
        type: 'SET_VALUES',
        values: { agentsAndToolsetsJson, isJsonView: true },
        options: { shouldValidate: true },
      });
    },
    [state.values],
  );
  const switchToSimpleView = useCallback((toolsets: AnyToolset[]) => {
    dispatch({
      type: 'SET_VALUES',
      values: {
        agentsAndToolsets: getAgentsAndToolsetsFormValue(toolsets) as QuickApp2FormValues['agentsAndToolsets'],
        codeInterpreter: toolsets.some((toolset) => toolset.type === ToolsetTypes.CodeInterpreter),
        isJsonView: false,
      },
      options: { shouldValidate: true },
    });
  }, []);
  const discardJson = useCallback(
    (allEntitiesMap: AllEntitiesMap, language: string) => {
      const agentsAndToolsetsJson = JSON.stringify(
        getQuickApp2Toolsets({ data: state.values as QuickApp2Form, allEntitiesMap, language }),
        null,
        2,
      );
      dispatch({
        type: 'SET_VALUES',
        values: { agentsAndToolsetsJson, isJsonView: false },
        options: { shouldValidate: true },
      });
    },
    [state.values],
  );
  const updateStarter = useCallback(
    (index: number, field: StarterField, value: string) => dispatch({ type: 'UPDATE_STARTER', index, field, value }),
    [],
  );
  const removeStarter = useCallback((index: number) => dispatch({ type: 'REMOVE_STARTER', index }), []);
  const addDocuments = useCallback((documents: string[]) => dispatch({ type: 'ADD_DOCUMENTS', documents }), []);
  const removeDocument = useCallback(
    (document: string) => dispatch({ type: 'REMOVE_DOCUMENT', document }),
    [],
  );
  const setAttachmentTypes = useCallback(
    (tags: string[], previousTags: string[], invalidMessage: string) =>
      dispatch({ type: 'SET_ATTACHMENT_TYPES', tags, previousTags, invalidMessage }),
    [],
  );
  const setAttachmentTypesResetKey = useCallback(
    (value: number) => dispatch({ type: 'SET_ATTACHMENT_RESET_KEY', value }),
    [],
  );

  return useMemo(
    () => ({
      values: state.values,
      errors: state.errors,
      isDirty: !isEqual(state.values, state.initialValues),
      isModelReady: state.modelStatus === QuickApp2ModelStatus.Ready && !!state.values.model,
      attachmentTypesResetKey: state.attachmentTypesResetKey,
      setField,
      setValues,
      syncExternalState,
      validate,
      submit,
      clearError,
      reset,
      setAgentIds,
      configureAgent,
      switchToJsonView,
      switchToSimpleView,
      discardJson,
      updateStarter,
      removeStarter,
      addDocuments,
      removeDocument,
      setAttachmentTypes,
      setAttachmentTypesResetKey,
    }),
    [
      state,
      setField,
      setValues,
      syncExternalState,
      validate,
      submit,
      clearError,
      reset,
      setAgentIds,
      configureAgent,
      switchToJsonView,
      switchToSimpleView,
      discardJson,
      updateStarter,
      removeStarter,
      addDocuments,
      removeDocument,
      setAttachmentTypes,
      setAttachmentTypesResetKey,
    ],
  );
};
