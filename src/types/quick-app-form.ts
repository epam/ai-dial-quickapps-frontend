import type { LoadStatus } from '@/types/load-status';

export enum AddOnSchemaKeys {
  id = '[schema]:id',
  tool = '[schema]:tool',
  isDialDeploymentTool = '[schema]:isDialDeploymentTool',
  name = '[schema]:name',
}

export interface AddOnEntry {
  [AddOnSchemaKeys.id]: string;
  [AddOnSchemaKeys.tool]?: Record<string, unknown>;
  [AddOnSchemaKeys.isDialDeploymentTool]?: boolean;
}

export interface QuickApp2FormStarter {
  id: string;
  title: string;
  text: string;
  /** Keys of a stored starter the editor has no field for; written back on save. */
  extra?: Record<string, unknown>;
}

/** The validated form values. `QuickApp2Schema` (`@/form/quick-app-form-schema`) must produce this shape. */
export interface QuickApp2Form {
  instructions: string;
  temperature: number;
  documentRelativeUrl: string[];
  model: string;
  addOns: AddOnEntry[];
  codeInterpreter: boolean;
  /** Form-only: drives the Attachments switch and is never sent to chat-api. */
  attachmentsEnabled: boolean;
  inputAttachmentTypes: string[];
  maxInputAttachments?: number;
  introText?: string;
  chatMessageInputDisabled: boolean;
  autoSubmit: boolean;
  starters: QuickApp2FormStarter[];
  toolSupportingModelIds?: string[];
  availableModelIds?: string[];
  agentSkills: string[];
  timestamp: boolean;
  processLargeFiles: boolean;
  fileTools: boolean;
  addAttachment: boolean;
  webFetch: boolean;
  /**
   * Form-only: the stored config without the leaves this form owns (see
   * `getQuickApp2ExtraConfig`). It is merged back under the form values on save.
   */
  extraConfig?: Record<string, unknown>;
}

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
  schemaDefaultModelId?: string;
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
