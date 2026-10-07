import type { QuickApp2Form } from '@/form/quickApp2Form';

export type QuickApp2FormValues = Omit<QuickApp2Form, 'maxInputAttachments'> & {
  maxInputAttachments?: number | '';
};

export interface QuickApp2FormErrors {
  [path: string]: string | undefined;
}

export interface QuickApp2FormUpdateOptions {
  shouldValidate?: boolean;
  shouldDirty?: boolean;
}

export enum QuickApp2ModelStatus {
  Idle = 'idle',
  Loading = 'loading',
  Ready = 'ready',
  Error = 'error',
}

export interface QuickApp2FormExternalState {
  modelStatus: QuickApp2ModelStatus;
  toolSupportingModelIds?: string[];
  availableModelIds?: string[];
  existingModelId?: string;
  defaultModelId?: string;
  isCodeInterpreterEnabled: boolean;
  isWebFetchEnabled: boolean;
  isAddAttachmentEnabled: boolean;
  shouldValidate?: boolean;
}

export interface QuickApp2FormValidationSuccess {
  isValid: true;
  data: QuickApp2Form;
}

export interface QuickApp2FormValidationFailure {
  isValid: false;
  errors: QuickApp2FormErrors;
}

export type QuickApp2FormValidationResult =
  | QuickApp2FormValidationSuccess
  | QuickApp2FormValidationFailure;
