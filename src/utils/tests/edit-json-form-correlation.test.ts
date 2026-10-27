import get from 'lodash-es/get';
import omit from 'lodash-es/omit';
import set from 'lodash-es/set';
import { describe, expect, it } from 'vitest';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { getQuickApp2FormData, type QuickApp2Form } from '@/form/quickApp2Form';
import {
  areSameEditJsonDocuments,
  buildEditJsonDocument,
  parseEditJsonDocument,
  type EditJsonContext,
} from '@/utils/edit-json';

// A new app and apps filled in through the form in different ways: every form property must
// reach the JSON the popup shows, and the JSON must read back as the same form state.

const MODEL_WITH_TEMPERATURE = {
  id: 'model-1',
  type: 'model',
  features: { tools: true, temperature: true },
  inputAttachmentTypes: ['image/png', 'application/pdf'],
};
const MODEL_PLAIN = { id: 'model-2', type: 'model', features: { tools: true } };

const context: EditJsonContext = {
  allEntitiesMap: {
    'model-1': MODEL_WITH_TEMPERATURE,
    'model-2': MODEL_PLAIN,
  } as unknown as EditJsonContext['allEntitiesMap'],
  language: 'en',
  toolSupportingModelIds: ['model-1', 'model-2'],
  availableModelIds: ['model-1', 'model-2'],
  defaultModelId: 'model-1',
};

type Doc = Record<string, unknown>;

interface AppFixture {
  applicationProperties?: unknown;
  inputAttachmentTypes?: string[];
  maxInputAttachments?: number;
}

const loadForm = (app?: AppFixture): QuickApp2Form =>
  getQuickApp2FormData(
    app,
    context.toolSupportingModelIds,
    context.availableModelIds,
    context.defaultModelId,
  );

const buildDoc = (values: QuickApp2Form): Doc =>
  JSON.parse(buildEditJsonDocument(values, context)) as Doc;

const orchestrator = (content: string, model = 'model-1', extra: object = {}) => ({
  deployment: { deployment_id: model, ...extra },
  system_prompt: { type: 'custom', variables: {}, content },
});

const FULL_APP: AppFixture = {
  inputAttachmentTypes: ['image/png', 'application/pdf'],
  maxInputAttachments: 5,
  applicationProperties: {
    orchestrator: {
      ...orchestrator('Be thorough', 'model-1', { parameters: { temperature: 0.8 } }),
      attachment_strategy: null,
    },
    contexts: [
      { url: 'files/bucket/a.pdf', type: 'file' },
      { url: 'files/bucket/b.txt', type: 'file' },
    ],
    tool_sets: [
      { type: 'dial-mcp', deployment_id: 'toolsets/bucket/weather' },
      {
        type: 'dial-app',
        name: 'Research agent',
        deployment_id: 'applications/bucket/research',
        transport: 'mcp',
      },
      {
        name: 'dial-deployment-tool-set',
        type: 'dial-deployment',
        tools: [{ type: 'dial-deployment-simple', deployment_id: 'dall-e-3' }],
      },
      { template_name: 'py_interpreter', type: 'predefined' },
    ],
    conversation_starters: {
      intro_text: 'Hello!',
      chat_message_input_disabled: true,
      auto_submit: false,
      starters: [
        { title: 'Travel', text: 'Plan a trip' },
        { title: 'Food', text: 'Suggest a recipe' },
      ],
    },
    skills: [
      { type: 'dial-skill', url: 'skills/bucket/a' },
      { type: 'dial-skill', url: 'skills/bucket/b' },
    ],
    features: {
      timestamp: null,
      dial_files: {},
      representation_tooling: { add_attachment: true },
      web_fetch: { enabled: true },
    },
  },
};

const ALL_OFF_APP: AppFixture = {
  applicationProperties: {
    orchestrator: { ...orchestrator('Short'), attachment_strategy: null },
    contexts: [],
    tool_sets: [],
    conversation_starters: null,
    features: { timestamp: null, dial_files: null, representation_tooling: null, web_fetch: null },
  },
};

const SCENARIOS: Array<{ name: string; app?: AppFixture }> = [
  { name: 'a new app', app: undefined },
  {
    name: 'an app with only instructions',
    app: { applicationProperties: { orchestrator: orchestrator('Just instructions') } },
  },
  { name: 'an app with everything filled in', app: FULL_APP },
  { name: 'an app with every switch off', app: ALL_OFF_APP },
  {
    name: 'an app with attachments only',
    app: {
      inputAttachmentTypes: ['application/pdf'],
      maxInputAttachments: 3,
      applicationProperties: { orchestrator: orchestrator('Files please') },
    },
  },
  {
    name: 'an app with starters only',
    app: {
      applicationProperties: {
        orchestrator: orchestrator('Starters'),
        conversation_starters: {
          starters: [{ title: 'Only', text: 'One' }],
        },
      },
    },
  },
  {
    name: 'an app with a stored temperature on a model without temperature support',
    app: {
      applicationProperties: {
        orchestrator: orchestrator('Plain model', 'model-2', { parameters: { temperature: 0.4 } }),
      },
    },
  },
  {
    name: 'an app on a model without temperature support',
    app: {
      applicationProperties: {
        orchestrator: {
          ...orchestrator('Plain model', 'model-2'),
          attachment_strategy: { type: 'lazy_on_demand' },
        },
      },
    },
  },
];

const supportsTemperature = (values: QuickApp2Form) => values.model === 'model-1';
const acceptsAttachments = (values: QuickApp2Form) => values.model === 'model-1';
const nonBlankStarters = (values: QuickApp2Form) =>
  values.starters.filter((starter) => starter.title.trim() || starter.text.trim());
const toolSets = (doc: Doc) => (doc.tool_sets as Array<Record<string, unknown>>) ?? [];

// How each form property shows up in the JSON. A property added to the form without an entry here
// fails the coverage test below, so a new field cannot silently go missing from the popup.
const REPRESENTATION: Record<
  keyof QuickApp2Form,
  ((doc: Doc, values: QuickApp2Form) => void) | 'form-only' | 'external'
> = {
  instructions: (doc, values) =>
    expect(get(doc, 'orchestrator.system_prompt.content')).toBe(values.instructions),
  model: (doc, values) =>
    expect(get(doc, 'orchestrator.deployment.deployment_id')).toBe(values.model),
  // Written for a model that supports it. For any other model only a stored temperature is shown;
  // the form's default is never invented into the JSON.
  temperature: (doc, values) => {
    const temperature = get(doc, 'orchestrator.deployment.parameters.temperature');
    const isStored =
      get(values.extraConfig, 'orchestrator.deployment.parameters.temperature') !== undefined;
    if (supportsTemperature(values) || isStored) expect(temperature).toBe(values.temperature);
    else expect(temperature).toBeUndefined();
  },
  documentRelativeUrl: (doc, values) =>
    expect((doc.contexts as Array<{ url: string }>).map((context) => context.url)).toEqual(
      values.documentRelativeUrl,
    ),
  addOns: (doc, values) => {
    const userSets = toolSets(doc).filter((set) => set.type !== 'predefined');
    const represented = userSets.flatMap((set) =>
      set.type === 'dial-deployment' ? (set.tools as unknown[]) : [set],
    );
    expect(represented).toHaveLength(values.addOns.length);
  },
  codeInterpreter: (doc, values) =>
    expect(toolSets(doc).some((set) => set.type === 'predefined')).toBe(values.codeInterpreter),
  inputAttachmentTypes: (doc, values) =>
    expect(doc.input_attachment_types).toEqual(values.inputAttachmentTypes),
  maxInputAttachments: (doc, values) => {
    if (values.maxInputAttachments == null) {
      expect(doc.max_input_attachments).toBeUndefined();
    } else {
      expect(doc.max_input_attachments).toBe(values.maxInputAttachments);
    }
  },
  // Derived from the attachment types on load: the Attachments switch is on when there are any.
  attachmentsEnabled: (doc, values) =>
    expect((doc.input_attachment_types as string[]).length > 0).toBe(values.attachmentsEnabled),
  // The starters settings are written together with the starters: with none, nothing is stored.
  introText: (doc, values) =>
    expect(get(doc, 'conversation_starters.intro_text')).toBe(
      nonBlankStarters(values).length ? values.introText || undefined : undefined,
    ),
  chatMessageInputDisabled: (doc, values) =>
    expect(get(doc, 'conversation_starters.chat_message_input_disabled')).toBe(
      nonBlankStarters(values).length ? values.chatMessageInputDisabled : undefined,
    ),
  autoSubmit: (doc, values) =>
    expect(get(doc, 'conversation_starters.auto_submit')).toBe(
      nonBlankStarters(values).length ? values.autoSubmit : undefined,
    ),
  starters: (doc, values) =>
    expect(get(doc, 'conversation_starters.starters') ?? []).toEqual(
      nonBlankStarters(values).map(({ title, text }) => ({ title, text })),
    ),
  agentSkills: (doc, values) =>
    expect(((doc.skills as Array<{ url: string }>) ?? []).map((skill) => skill.url)).toEqual(
      values.agentSkills,
    ),
  timestamp: (doc, values) =>
    expect(get(doc, 'features.timestamp')).toEqual(
      values.timestamp ? { injection_strategy: 'tool_call' } : null,
    ),
  fileTools: (doc, values) =>
    expect(get(doc, 'features.dial_files')).toEqual(values.fileTools ? {} : null),
  addAttachment: (doc, values) =>
    expect(get(doc, 'features.representation_tooling')).toEqual(
      values.addAttachment ? { add_attachment: true } : null,
    ),
  webFetch: (doc, values) =>
    expect(get(doc, 'features.web_fetch')).toEqual(values.webFetch ? { enabled: true } : null),
  // Written only for a model that accepts attachments; otherwise the stored value stays.
  processLargeFiles: (doc, values) => {
    if (!acceptsAttachments(values)) return;
    expect(get(doc, 'orchestrator.attachment_strategy')).toEqual(
      values.processLargeFiles ? { type: 'lazy_on_demand' } : null,
    );
  },
  toolSupportingModelIds: 'external',
  availableModelIds: 'external',
  extraConfig: 'form-only',
};

describe.each(SCENARIOS)('JSON editor and form for $name', ({ app }) => {
  const values = loadForm(app);
  const doc = buildDoc(values);

  it('lists every form property in the representation table', () => {
    expect(Object.keys(values).sort()).toEqual(Object.keys(REPRESENTATION).sort());
  });

  it('shows every form property in the JSON', () => {
    (
      Object.entries(REPRESENTATION) as Array<
        [keyof QuickApp2Form, (typeof REPRESENTATION)[keyof QuickApp2Form]]
      >
    ).forEach(([, check]) => {
      if (typeof check === 'function') check(doc, values);
    });
  });

  it('keeps the loaded model lists out of the JSON', () => {
    expect(JSON.stringify(doc)).not.toContain('toolSupportingModelIds');
    expect(JSON.stringify(doc)).not.toContain('availableModelIds');
  });

  it('reads back as the same form state', () => {
    const result = parseEditJsonDocument(JSON.stringify(doc), context);

    if (!values.instructions.trim()) {
      expect(result).toMatchObject({
        isValid: false,
        errors: [{ key: ApplicationEditorI18nKeys.InstructionsRequired }],
      });
      return;
    }
    expect(result.isValid).toBe(true);
    if (!result.isValid) return;
    const comparable = (form: QuickApp2Form) => ({
      ...omit(form, ['extraConfig']),
      starters: form.starters.map((starter) => omit(starter, 'id')),
    });
    expect(comparable(result.values)).toEqual(comparable(values));
    expect(areSameEditJsonDocuments(result.values, values, context)).toBe(true);
  });
});

describe('a new app', () => {
  const values = loadForm(undefined);

  it('starts with the form defaults in the JSON', () => {
    const doc = buildDoc(values);

    expect(get(doc, 'orchestrator.system_prompt.content')).toBe('');
    expect(get(doc, 'orchestrator.deployment.deployment_id')).toBe('model-1');
    expect(get(doc, 'orchestrator.deployment.parameters.temperature')).toBe(0.5);
    expect(get(doc, 'features.timestamp')).toEqual({ injection_strategy: 'tool_call' });
    expect(get(doc, 'features.dial_files')).toEqual({});
    expect(doc.contexts).toEqual([]);
    expect(doc.skills).toBeUndefined();
    expect(doc.conversation_starters).toBeNull();
    expect(doc.input_attachment_types).toEqual([]);
  });

  it('can be saved from the popup once instructions are filled in', () => {
    const doc = buildDoc(values);
    set(doc, 'orchestrator.system_prompt.content', 'Now it has instructions');

    const result = parseEditJsonDocument(JSON.stringify(doc), context);

    expect(result.isValid).toBe(true);
    if (!result.isValid) return;
    expect(result.values.instructions).toBe('Now it has instructions');
  });
});

describe('editing the JSON of an app with everything filled in', () => {
  const values = loadForm(FULL_APP);

  const edit = (mutate: (doc: Doc) => void): QuickApp2Form => {
    const doc = buildDoc(values);
    mutate(doc);
    const result = parseEditJsonDocument(JSON.stringify(doc), context);
    expect(result.isValid).toBe(true);
    if (!result.isValid) throw new Error('document should be valid');
    return result.values;
  };

  it.each([
    [
      'instructions',
      (doc: Doc) => set(doc, 'orchestrator.system_prompt.content', 'Edited'),
      (v: QuickApp2Form) => expect(v.instructions).toBe('Edited'),
    ],
    [
      'temperature',
      (doc: Doc) => set(doc, 'orchestrator.deployment.parameters.temperature', 0.2),
      (v: QuickApp2Form) => expect(v.temperature).toBe(0.2),
    ],
    [
      'timestamp',
      (doc: Doc) => set(doc, 'features.timestamp', null),
      (v: QuickApp2Form) => expect(v.timestamp).toBe(false),
    ],
    [
      'file tools',
      (doc: Doc) => set(doc, 'features.dial_files', null),
      (v: QuickApp2Form) => expect(v.fileTools).toBe(false),
    ],
    [
      'add attachment',
      (doc: Doc) => set(doc, 'features.representation_tooling', null),
      (v: QuickApp2Form) => expect(v.addAttachment).toBe(false),
    ],
    [
      'web fetch',
      (doc: Doc) => set(doc, 'features.web_fetch', null),
      (v: QuickApp2Form) => expect(v.webFetch).toBe(false),
    ],
    [
      'process files',
      (doc: Doc) => set(doc, 'orchestrator.attachment_strategy', { type: 'lazy_on_demand' }),
      (v: QuickApp2Form) => expect(v.processLargeFiles).toBe(true),
    ],
    [
      'attachment types',
      (doc: Doc) => set(doc, 'input_attachment_types', ['image/png']),
      (v: QuickApp2Form) => expect(v.inputAttachmentTypes).toEqual(['image/png']),
    ],
    [
      'max attachments',
      (doc: Doc) => set(doc, 'max_input_attachments', 9),
      (v: QuickApp2Form) => expect(v.maxInputAttachments).toBe(9),
    ],
    [
      'knowledge base',
      (doc: Doc) => set(doc, 'contexts', []),
      (v: QuickApp2Form) => expect(v.documentRelativeUrl).toEqual([]),
    ],
    [
      'skills',
      (doc: Doc) => set(doc, 'skills', [{ type: 'dial-skill', url: 'skills/bucket/b' }]),
      (v: QuickApp2Form) => expect(v.agentSkills).toEqual(['skills/bucket/b']),
    ],
    [
      'intro text',
      (doc: Doc) => set(doc, 'conversation_starters.intro_text', 'New intro'),
      (v: QuickApp2Form) => expect(v.introText).toBe('New intro'),
    ],
    [
      'auto submit',
      (doc: Doc) => set(doc, 'conversation_starters.auto_submit', true),
      (v: QuickApp2Form) => expect(v.autoSubmit).toBe(true),
    ],
    [
      'chat input',
      (doc: Doc) => set(doc, 'conversation_starters.chat_message_input_disabled', false),
      (v: QuickApp2Form) => expect(v.chatMessageInputDisabled).toBe(false),
    ],
    [
      'starters',
      (doc: Doc) =>
        set(doc, 'conversation_starters.starters', [{ title: 'Solo', text: 'Starter' }]),
      (v: QuickApp2Form) => expect(v.starters.map((s) => s.title)).toEqual(['Solo', '']),
    ],
    [
      'code interpreter',
      (doc: Doc) =>
        set(
          doc,
          'tool_sets',
          toolSets(doc).filter((s) => s.type !== 'predefined'),
        ),
      (v: QuickApp2Form) => expect(v.codeInterpreter).toBe(false),
    ],
    [
      'add-ons',
      (doc: Doc) =>
        set(
          doc,
          'tool_sets',
          toolSets(doc).filter((s) => s.type === 'predefined'),
        ),
      (v: QuickApp2Form) => expect(v.addOns).toEqual([]),
    ],
  ])('changes the form %s', (_name, mutate, expectChange) => {
    expectChange(edit(mutate));
  });

  it('changes the model', () => {
    const next = edit((doc) => set(doc, 'orchestrator.deployment.deployment_id', 'model-2'));

    expect(next.model).toBe('model-2');
  });
});
