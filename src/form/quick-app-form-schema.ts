import { z } from 'zod';

z.config({ jitless: true });
import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { AddOnSchemaKeys, type QuickApp2Form } from '@/types/quick-app-form';

const AddOnSchema = z.object({
  [AddOnSchemaKeys.id]: z.string(),
  [AddOnSchemaKeys.tool]: z.record(z.string(), z.any()).optional(),
  [AddOnSchemaKeys.isDialDeploymentTool]: z.boolean().optional(),
});

const AttachmentTypesSchema = z.array(z.string());
const MaxInputAttachmentsSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const isEmptyMaxInputAttachments = (value: unknown): boolean => value == null || value === '';

export const isValidMaxInputAttachments = (value: unknown, isRequired = false): boolean => {
  if (isRequired && isEmptyMaxInputAttachments(value)) return false;
  return MaxInputAttachmentsSchema.safeParse(value).success;
};

// Host values that are not a positive integer (0, negatives, decimals, null, garbage) count as
// missing; a numeric string such as "3" is accepted.
export const normalizeMaxInputAttachments = (value: unknown): number | undefined => {
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const result = MaxInputAttachmentsSchema.safeParse(value);
  return result.success ? result.data : undefined;
};

// `satisfies` keeps the schema's output in step with the `QuickApp2Form` interface in `@/types`.
export const QuickApp2Schema = z
  .object({
    // `refine`, not `trim()`: the saved system prompt must keep its whitespace as typed.
    instructions: z.string().refine((value) => value.trim().length > 0, {
      message: ApplicationEditorI18nKeys.InstructionsRequired,
    }),
    temperature: z.number(),
    documentRelativeUrl: z.array(z.string()),
    model: z.string(),
    addOns: z.array(AddOnSchema),
    codeInterpreter: z.boolean(),
    // Form-only: drives the Attachments switch and is never sent to chat-api.
    attachmentsEnabled: z.boolean(),
    inputAttachmentTypes: AttachmentTypesSchema,
    maxInputAttachments: MaxInputAttachmentsSchema,
    introText: z.string().optional(),
    chatMessageInputDisabled: z.boolean(),
    autoSubmit: z.boolean(),
    starters: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        text: z.string(),
        // Keys of a stored starter the editor has no field for; written back on save.
        extra: z.record(z.string(), z.unknown()).optional(),
      }),
    ),
    toolSupportingModelIds: z.array(z.string()).optional(),
    availableModelIds: z.array(z.string()).optional(),
    agentSkills: z.array(z.string()),
    timestamp: z.boolean(),
    processLargeFiles: z.boolean(),
    fileTools: z.boolean(),
    addAttachment: z.boolean(),
    webFetch: z.boolean(),
    // Form-only: the stored config without the leaves this form owns (see
    // `getQuickApp2ExtraConfig`). It is merged back under the form values on save.
    extraConfig: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.attachmentsEnabled && data.maxInputAttachments == null) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxInputAttachments'],
        message: ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachmentsRequired,
      });
    }

    if (data.attachmentsEnabled && data.inputAttachmentTypes.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['inputAttachmentTypes'],
        message: ApplicationEditorI18nKeys.AttachmentsTypesRequired,
      });
    }

    const modelExists = !data.availableModelIds || data.availableModelIds.includes(data.model);
    if (!modelExists) {
      ctx.addIssue({
        code: 'custom',
        path: ['model'],
        message: ApplicationEditorI18nKeys.OrchestratorModelUnavailable,
      });
      return;
    }

    if (data.toolSupportingModelIds?.includes(data.model) === false) {
      ctx.addIssue({
        code: 'custom',
        path: ['model'],
        message: ApplicationEditorI18nKeys.OrchestratorModelToolsUnsupported,
      });
    }
  }) satisfies z.ZodType<QuickApp2Form>;
