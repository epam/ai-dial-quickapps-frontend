import get from 'lodash-es/get';
import omit from 'lodash-es/omit';
import set from 'lodash-es/set';
import { describe, expect, it } from 'vitest';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import type { QuickApp2Form } from '@/types/quick-app-form';
import { getQuickApp2FormData } from '@/form/quick-app-form-data';
import { buildQuickApp2Config } from '@/form/build-quick-app-config';
import {
  areSameEditJsonDocuments,
  buildEditJsonDocument,
  parseEditJsonDocument,
  reuseStarterIds,
} from '@/utils/edit-json';
import type { QuickApp2Config } from '@/types/quick-apps';

type Context = Parameters<typeof buildEditJsonDocument>[1];

const context: Context = {
  allEntitiesMap: {
    'model-1': { id: 'model-1', features: { temperature: true, tools: true } },
  } as unknown as Context['allEntitiesMap'],
  language: 'en',
  toolSupportingModelIds: ['model-1'],
  availableModelIds: ['model-1', 'model-2'],
  defaultModelId: 'model-1',
};

const STORED = {
  tool_defaults: { timeout_seconds: 60 },
  orchestrator: {
    deployment: { deployment_id: 'model-1', name: 'Main' },
    system_prompt: { type: 'custom', variables: {}, content: 'Be brief' },
    max_iterations: 20,
  },
  contexts: [],
  tool_sets: [],
  conversation_starters: null,
  skills: [{ type: 'dial-skill', url: 'skills/a' }],
  features: { timestamp: { injection_strategy: 'tool_call' }, dial_files: {} },
} as unknown as QuickApp2Config;

const loadValues = (): QuickApp2Form =>
  getQuickApp2FormData(
    { applicationProperties: STORED },
    context.toolSupportingModelIds,
    context.availableModelIds,
    context.defaultModelId,
  );

const buildDocument = (values: QuickApp2Form = loadValues()): object =>
  JSON.parse(buildEditJsonDocument(values, context)) as object;

describe('buildEditJsonDocument', () => {
  it('is pretty printed with two spaces', () => {
    expect(buildEditJsonDocument(loadValues(), context)).toContain('\n  "orchestrator": {');
  });

  it('shows unsaved form edits', () => {
    const document = buildDocument({ ...loadValues(), instructions: 'Changed' });

    expect(get(document, 'orchestrator.system_prompt.content')).toBe('Changed');
  });

  it('shows stored keys the form has no field for', () => {
    const document = buildDocument();

    expect(get(document, 'tool_defaults')).toEqual({ timeout_seconds: 60 });
    expect(get(document, 'orchestrator.max_iterations')).toBe(20);
    expect(get(document, 'orchestrator.deployment.name')).toBe('Main');
  });

  it('contains the attachment fields and no metadata', () => {
    const document = buildDocument({
      ...loadValues(),
      attachmentsEnabled: true,
      inputAttachmentTypes: ['image/png'],
      maxInputAttachments: 5,
    });

    expect(get(document, 'input_attachment_types')).toEqual(['image/png']);
    expect(get(document, 'max_input_attachments')).toBe(5);
    for (const key of ['name', 'description', 'version', 'iconUrl', 'topics', 'tags']) {
      expect(document).not.toHaveProperty(key);
    }
  });

  it('omits the max attachments when empty', () => {
    expect(buildDocument()).not.toHaveProperty('max_input_attachments');
  });
});

describe('parseEditJsonDocument', () => {
  it('round-trips the built document', () => {
    const values = loadValues();
    const result = parseEditJsonDocument(buildEditJsonDocument(values, context), context);

    expect(result.isValid).toBe(true);
    if (!result.isValid) return;
    const comparable = (form: QuickApp2Form) => ({
      ...omit(form, 'extraConfig'),
      starters: form.starters.map((starter) => omit(starter, 'id')),
    });
    expect(comparable(result.values)).toEqual(comparable(values));
    expect(areSameEditJsonDocuments(result.values, values, context)).toBe(true);
  });

  it('reports a syntax error with the parser message', () => {
    const result = parseEditJsonDocument('{ "orchestrator": ', context);

    expect(result).toMatchObject({
      isValid: false,
      errors: [{ key: ApplicationEditorI18nKeys.EditJsonSyntaxError }],
    });
    expect(result.isValid === false && result.errors[0].values?.message).toBeTruthy();
  });

  it.each(['[]', '"x"', '1', 'null'])('rejects a root that is not an object: %s', (text) => {
    expect(parseEditJsonDocument(text, context)).toEqual({
      isValid: false,
      errors: [{ key: ApplicationEditorI18nKeys.EditJsonRootMustBeObject }],
    });
  });

  it('rejects wrong types without throwing', () => {
    const document = { ...buildDocument(), tool_sets: 1 };
    const result = parseEditJsonDocument(JSON.stringify(document), context);

    expect(result.isValid).toBe(false);
    expect(result.isValid === false && result.errors[0].key).toBe(
      ApplicationEditorI18nKeys.EditJsonInvalidStructure,
    );
  });

  it('rejects a missing orchestrator', () => {
    expect(parseEditJsonDocument('{}', context).isValid).toBe(false);
  });

  it('rejects empty instructions with the form message', () => {
    const document = buildDocument();
    set(document, 'orchestrator.system_prompt.content', '  ');
    const result = parseEditJsonDocument(JSON.stringify(document), context);

    expect(result).toMatchObject({
      isValid: false,
      errors: [{ key: ApplicationEditorI18nKeys.InstructionsRequired }],
    });
  });

  it('rejects a model that is not available', () => {
    const document = buildDocument();
    set(document, 'orchestrator.deployment.deployment_id', 'missing');
    const result = parseEditJsonDocument(JSON.stringify(document), context);

    expect(result).toMatchObject({
      isValid: false,
      errors: [{ key: ApplicationEditorI18nKeys.OrchestratorModelUnavailable }],
    });
  });

  it('keeps an extra key typed in the JSON and drops one removed from it', () => {
    const document = buildDocument();
    set(document, 'my_section', { a: 1 });
    set(document, 'orchestrator.max_iterations', undefined);
    const result = parseEditJsonDocument(JSON.stringify(document), context);

    expect(result.isValid).toBe(true);
    if (!result.isValid) return;
    expect(result.values.extraConfig?.my_section).toEqual({ a: 1 });
    expect(result.values.extraConfig?.tool_defaults).toEqual({ timeout_seconds: 60 });
    expect(
      (result.values.extraConfig?.orchestrator as Record<string, unknown>).max_iterations,
    ).toBeUndefined();
  });

  it('writes the typed document back as the saved configuration', () => {
    const document = buildDocument();
    set(document, 'my_section', { a: 1 });
    set(document, 'features.custom_flag', true);
    set(document, 'orchestrator.deployment.parameters', { top_p: 1 });
    const result = parseEditJsonDocument(JSON.stringify(document), context);

    expect(result.isValid).toBe(true);
    if (!result.isValid) return;
    const saved = buildQuickApp2Config({
      data: result.values,
      allEntitiesMap: context.allEntitiesMap,
      language: 'en',
    });
    expect(get(saved, 'my_section')).toEqual({ a: 1 });
    expect(get(saved, 'features.custom_flag')).toBe(true);
    expect(get(saved, 'tool_defaults')).toEqual({ timeout_seconds: 60 });
    expect(get(saved, 'orchestrator.deployment.parameters')).toEqual({
      top_p: 1,
      temperature: 0.5,
    });
  });

  it('reads the form values from the document', () => {
    const document = buildDocument();
    set(document, 'orchestrator.deployment.deployment_id', 'model-2');
    set(document, 'skills', []);
    const result = parseEditJsonDocument(JSON.stringify(document), {
      ...context,
      toolSupportingModelIds: ['model-1', 'model-2'],
    });

    expect(result.isValid).toBe(true);
    if (!result.isValid) return;
    expect(result.values.model).toBe('model-2');
    expect(result.values.agentSkills).toEqual([]);
  });
});

describe('areSameEditJsonDocuments', () => {
  it('ignores key order and regenerated starter ids', () => {
    const values = loadValues();
    const parsed = parseEditJsonDocument(buildEditJsonDocument(values, context), context);

    expect(parsed.isValid).toBe(true);
    if (!parsed.isValid) return;
    expect(areSameEditJsonDocuments(parsed.values, values, context)).toBe(true);
  });

  it('tells apart values that would be saved differently', () => {
    const values = loadValues();

    expect(areSameEditJsonDocuments({ ...values, instructions: 'Other' }, values, context)).toBe(
      false,
    );
  });
});

describe('reuseStarterIds', () => {
  it('keeps the id of an unchanged starter at the same position only', () => {
    const current = [
      { id: 'a', title: 'T', text: 'X' },
      { id: 'b', title: '', text: '' },
    ];
    const next = [
      { id: 'n1', title: 'T', text: 'X' },
      { id: 'n2', title: 'Changed', text: '' },
    ];

    expect(reuseStarterIds(next, current).map((starter) => starter.id)).toEqual(['a', 'n2']);
  });
});
