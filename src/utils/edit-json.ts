import isEqual from 'lodash-es/isEqual';
import isPlainObject from 'lodash-es/isPlainObject';
import omit from 'lodash-es/omit';
import { z } from 'zod';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import {
  buildQuickApp2Config,
  getQuickApp2FormData,
  QuickApp2Schema,
  type QuickApp2Form,
} from '@/form/quickApp2Form';
import type { DialAIEntityModel, LocalizedText } from '@/types/dial-entities';
import type { QuickApp2FormValues } from '@/types/quick-app-form';

type EntitiesMap = Record<
  string,
  DialAIEntityModel & { id: string; name?: LocalizedText; type?: string }
>;

export interface EditJsonError {
  key: ApplicationEditorI18nKeys;
  values?: Record<string, string>;
}

export interface EditJsonContext {
  allEntitiesMap: EntitiesMap;
  language: string;
  toolSupportingModelIds?: string[];
  availableModelIds?: string[];
  defaultModelId?: string;
}

export type EditJsonParseResult =
  { isValid: true; values: QuickApp2Form } | { isValid: false; errors: EditJsonError[] };

const ATTACHMENT_TYPES_KEY = 'input_attachment_types';
const MAX_ATTACHMENTS_KEY = 'max_input_attachments';

const optionalArray = z.array(z.unknown()).nullish();
const optionalObject = z.record(z.string(), z.unknown()).nullish();

// Types only: enough for the mapping to the form not to throw on a malformed document.
const EditJsonDocumentSchema = z.looseObject({
  orchestrator: z.looseObject({
    deployment: z.looseObject({
      deployment_id: z.string().min(1),
      parameters: optionalObject,
    }),
    system_prompt: z.looseObject({ content: z.string() }),
  }),
  contexts: optionalArray,
  tool_sets: optionalArray,
  skills: optionalArray,
  conversation_starters: z
    .looseObject({ starters: z.array(z.looseObject({ title: z.string(), text: z.string() })) })
    .nullish(),
  features: optionalObject,
  [ATTACHMENT_TYPES_KEY]: z.array(z.string()).nullish(),
  [MAX_ATTACHMENTS_KEY]: z.union([z.number(), z.string()]).nullish(),
});

/**
 * The JSON a save would write for the current form values, plus the app-level attachment
 * fields. Metadata (name, description, version, avatar, tags) is not part of it.
 */
export const buildEditJsonDocument = (
  values: QuickApp2FormValues,
  { allEntitiesMap, language }: EditJsonContext,
): string => {
  const config = buildQuickApp2Config({ data: values as QuickApp2Form, allEntitiesMap, language });
  const { maxInputAttachments } = values;
  const document = {
    ...config,
    [ATTACHMENT_TYPES_KEY]: values.inputAttachmentTypes,
    ...(maxInputAttachments != null && maxInputAttachments !== ''
      ? { [MAX_ATTACHMENTS_KEY]: Number(maxInputAttachments) }
      : {}),
  };
  return JSON.stringify(document, null, 2);
};

/** Whether two form values would be saved as the same configuration (key order is ignored). */
export const areSameEditJsonDocuments = (
  a: QuickApp2FormValues,
  b: QuickApp2FormValues,
  context: EditJsonContext,
): boolean =>
  isEqual(
    JSON.parse(buildEditJsonDocument(a, context)),
    JSON.parse(buildEditJsonDocument(b, context)),
  );

const formatPath = (path: PropertyKey[]): string => path.map(String).join('.');

const getIssueError = (issue: z.core.$ZodIssue): EditJsonError => {
  const isFormMessage = (Object.values(ApplicationEditorI18nKeys) as string[]).includes(
    issue.message,
  );
  if (isFormMessage) return { key: issue.message as ApplicationEditorI18nKeys };
  const path = formatPath(issue.path);
  return {
    key: ApplicationEditorI18nKeys.EditJsonInvalidStructure,
    values: { message: path ? `${path}: ${issue.message}` : issue.message },
  };
};

/** Parses the popup text into form values (including the new extra config), or errors. */
export const parseEditJsonDocument = (text: string, context: EditJsonContext): EditJsonParseResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      isValid: false,
      errors: [
        {
          key: ApplicationEditorI18nKeys.EditJsonSyntaxError,
          values: { message: error instanceof Error ? error.message : String(error) },
        },
      ],
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      isValid: false,
      errors: [{ key: ApplicationEditorI18nKeys.EditJsonRootMustBeObject }],
    };
  }

  const shape = EditJsonDocumentSchema.safeParse(parsed);
  if (!shape.success) return { isValid: false, errors: shape.error.issues.map(getIssueError) };

  const {
    [ATTACHMENT_TYPES_KEY]: inputAttachmentTypes,
    [MAX_ATTACHMENTS_KEY]: maxInputAttachments,
    ...applicationProperties
  } = parsed as Record<string, unknown>;

  const values = getQuickApp2FormData(
    { applicationProperties, inputAttachmentTypes, maxInputAttachments },
    context.toolSupportingModelIds,
    context.availableModelIds,
    context.defaultModelId,
  );

  const result = QuickApp2Schema.safeParse(values);
  if (!result.success) return { isValid: false, errors: result.error.issues.map(getIssueError) };
  return { isValid: true, values };
};

/**
 * Starters get new ids when the document is parsed. A starter equal to the one at the same
 * position keeps that one's id, so saving an unchanged document does not make the form dirty.
 */
export const reuseStarterIds = (
  next: QuickApp2Form['starters'],
  current: QuickApp2Form['starters'],
): QuickApp2Form['starters'] =>
  next.map((starter, index) => {
    const currentStarter = current[index];
    return currentStarter && isEqual(omit(starter, 'id'), omit(currentStarter, 'id'))
      ? { ...starter, id: currentStarter.id }
      : starter;
  });
