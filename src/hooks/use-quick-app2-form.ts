import { useCallback, useMemo, useReducer } from 'react';
import isEqual from 'lodash-es/isEqual';

import {
  AgentOrToolsetSchemaKeys,
  QuickApp2Schema,
  resolveDefaultModelId,
} from '@/form/quickApp2Form';
import { removeStarter, updateStarterField } from '@/utils/conversation-starters';
import { decodeFileUrl } from '@/utils/decode-file-url';
import {
  QuickApp2ModelStatus,
  type QuickApp2FormErrors,
  type QuickApp2FormExternalState,
  type QuickApp2FormUpdateOptions,
  type QuickApp2FormValidationResult,
  type QuickApp2FormValues,
} from '@/types/quick-app-form';
import type { StarterField } from '@/types/conversation-starters';
import type { DialAppTransportType } from '@/types/quick-apps';

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
  | { type: 'REMOVE_DOCUMENT'; document: string };

interface FormState {
  values: QuickApp2FormValues;
  initialValues: QuickApp2FormValues;
  errors: QuickApp2FormErrors;
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
  updateStarter: (index: number, field: StarterField, value: string) => void;
  removeStarter: (index: number) => void;
  addDocuments: (documents: string[]) => void;
  removeDocument: (document: string) => void;
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
      const nextInitialValues = { ...state.initialValues, ...initialValues };
      const nextErrors = externalState.shouldValidate
        ? getQuickApp2FormErrors(nextValues)
        : state.errors;

      if (
        isEqual(nextValues, state.values) &&
        isEqual(nextInitialValues, state.initialValues) &&
        isEqual(nextErrors, state.errors) &&
        externalState.modelStatus === state.modelStatus
      ) {
        return state;
      }

      return {
        ...state,
        values: nextValues,
        initialValues: nextInitialValues,
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
      const starters = updateStarterField(state.values.starters, action.index, action.field, action.value);
      if (starters === state.values.starters) return state;
      return applyValues(state, { starters }, { shouldValidate: true });
    }
    case 'REMOVE_STARTER': {
      const starters = removeStarter(state.values.starters, action.index);
      if (starters === state.values.starters) return state;
      return applyValues(state, { starters }, { shouldValidate: true });
    }
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

  return useMemo(
    () => ({
      values: state.values,
      errors: state.errors,
      isDirty: !isEqual(state.values, state.initialValues),
      isModelReady: state.modelStatus === QuickApp2ModelStatus.Ready && !!state.values.model,
      setField,
      setValues,
      syncExternalState,
      validate,
      submit,
      clearError,
      reset,
      setAgentIds,
      configureAgent,
      updateStarter,
      removeStarter,
      addDocuments,
      removeDocument,
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
      updateStarter,
      removeStarter,
      addDocuments,
      removeDocument,
    ],
  );
};
