import type { QuickApp2Form } from '@/form/quickApp2Form';
import type { LoadStatus } from '@/types/load-status';

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

export interface QuickApp2FormExternalState {
  modelStatus: LoadStatus;
  toolSupportingModelIds?: string[];
  availableModelIds?: string[];
  existingModelId?: string;
  defaultModelId?: string;
  isCodeInterpreterEnabled: boolean;
  isWebFetchEnabled: boolean;
  isAddAttachmentEnabled: boolean;
  shouldValidate?: boolean;
}

interface QuickApp2FormValidationSuccess {
  isValid: true;
  data: QuickApp2Form;
}

interface QuickApp2FormValidationFailure {
  isValid: false;
  errors: QuickApp2FormErrors;
}

export type QuickApp2FormValidationResult =
  QuickApp2FormValidationSuccess | QuickApp2FormValidationFailure;
