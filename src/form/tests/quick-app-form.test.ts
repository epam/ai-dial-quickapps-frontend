import { describe, expect, it } from 'vitest';

import { DEFAULT_MAX_INPUT_ATTACHMENTS } from '@/constants/quick-apps';
import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import {
  QuickApp2Schema,
  isValidMaxInputAttachments,
  type QuickApp2Form,
} from '@/form/quick-app-form-schema';
import {
  getAddOnsFormValue,
  getQuickApp2FormData,
  resolveDefaultModelId,
} from '@/form/quick-app-form-data';
import { buildQuickApp2Config, getQuickApp2Toolsets } from '@/form/build-quick-app-config';
import { AddOnSchemaKeys } from '@/types/quick-app-form';
import { type AnyToolset, ToolsetTypes } from '@/types/quick-apps';

const createForm = (overrides: Partial<QuickApp2Form> = {}): QuickApp2Form => ({
  instructions: 'Be helpful',
  temperature: 1,
  documentRelativeUrl: [],
  model: 'model-1',
  addOns: [],
  codeInterpreter: false,
  attachmentsEnabled: false,
  inputAttachmentTypes: [],
  maxInputAttachments: undefined,
  introText: undefined,
  chatMessageInputDisabled: false,
  autoSubmit: true,
  starters: [{ id: 'starter-1', title: '', text: '' }],
  toolSupportingModelIds: ['model-1'],
  availableModelIds: ['model-1'],
  agentSkills: [],
  timestamp: true,
  processLargeFiles: false,
  fileTools: false,
  addAttachment: false,
  webFetch: false,
  ...overrides,
});

describe('QuickApp2Schema', () => {
  it('accepts a complete default form', () => {
    const result = QuickApp2Schema.safeParse(createForm());

    expect(result.success).toBe(true);
  });

  it('requires non-blank instructions and keeps their whitespace in the parsed data', () => {
    for (const instructions of ['', '   \n\t']) {
      const result = QuickApp2Schema.safeParse(createForm({ instructions }));
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({
        path: ['instructions'],
        message: ApplicationEditorI18nKeys.InstructionsRequired,
      });
    }

    const result = QuickApp2Schema.safeParse(createForm({ instructions: '  Be helpful\n' }));
    expect(result.data?.instructions).toBe('  Be helpful\n');
  });

  it('rejects a model that is not available', () => {
    const result = QuickApp2Schema.safeParse(
      createForm({ model: 'missing-model', availableModelIds: ['model-1'] }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['model'],
            message: ApplicationEditorI18nKeys.OrchestratorModelUnavailable,
          }),
        ]),
      );
    }
  });

  it('rejects a model without tool support', () => {
    const result = QuickApp2Schema.safeParse(
      createForm({ model: 'model-2', availableModelIds: ['model-1', 'model-2'] }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['model'],
            message: ApplicationEditorI18nKeys.OrchestratorModelToolsUnsupported,
          }),
        ]),
      );
    }
  });

  it('accepts an empty attachment count as an optional value', () => {
    const result = QuickApp2Schema.safeParse(
      createForm({ maxInputAttachments: '' as unknown as number }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxInputAttachments).toBeUndefined();
    }
  });

  it('coerces a positive attachment count and rejects non-positive counts', () => {
    const validResult = QuickApp2Schema.safeParse(
      createForm({ maxInputAttachments: '3' as unknown as number }),
    );
    const invalidResult = QuickApp2Schema.safeParse(createForm({ maxInputAttachments: 0 }));

    expect(validResult.success).toBe(true);
    if (validResult.success) {
      expect(validResult.data.maxInputAttachments).toBe(3);
    }
    expect(invalidResult.success).toBe(false);
  });

  it('requires an attachment count while attachments are enabled', () => {
    const result = QuickApp2Schema.safeParse(
      createForm({
        attachmentsEnabled: true,
        inputAttachmentTypes: ['image/png'],
        maxInputAttachments: '' as unknown as number,
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['maxInputAttachments'],
            message: ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachmentsRequired,
          }),
        ]),
      );
    }
  });

  it('keeps the attachment count optional while attachments are disabled', () => {
    const result = QuickApp2Schema.safeParse(
      createForm({ attachmentsEnabled: false, maxInputAttachments: undefined }),
    );

    expect(result.success).toBe(true);
  });

  it('requires at least one attachment type while attachments are enabled', () => {
    const result = QuickApp2Schema.safeParse(
      createForm({ attachmentsEnabled: true, maxInputAttachments: 1 }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          path: ['inputAttachmentTypes'],
          message: ApplicationEditorI18nKeys.AttachmentsTypesRequired,
        }),
      ]);
    }
  });

  it.each([
    [
      'enabled with a type',
      {
        attachmentsEnabled: true,
        inputAttachmentTypes: ['application/pdf'],
        maxInputAttachments: 1,
      },
    ],
    ['disabled without types', { attachmentsEnabled: false, inputAttachmentTypes: [] }],
  ])('accepts attachments %s', (_label, overrides) => {
    expect(QuickApp2Schema.safeParse(createForm(overrides)).success).toBe(true);
  });
});

describe('resolveDefaultModelId', () => {
  it('pre-selects the configured default when it is among the loaded deployments', () => {
    expect(
      resolveDefaultModelId(undefined, ['model-1', 'model-2'], ['model-1', 'model-2'], 'model-2'),
    ).toBe('model-2');
  });

  it('pre-selects the first tool-supporting model when no default is configured, even if gpt-4o exists', () => {
    expect(resolveDefaultModelId(undefined, ['model-1', 'gpt-4o'], ['gpt-4o', 'model-1'])).toBe(
      'model-1',
    );
  });

  it('falls back to the first tool-supporting model when the configured default is not loaded', () => {
    expect(resolveDefaultModelId(undefined, ['model-1'], ['model-1'], 'missing-model')).toBe(
      'model-1',
    );
  });

  it('leaves the model empty when there is no usable model', () => {
    expect(resolveDefaultModelId(undefined, [], ['model-without-tools'], 'missing-model')).toBe('');
  });

  it('keeps the stored model', () => {
    expect(
      resolveDefaultModelId('model-3', ['model-1', 'model-2'], ['model-1', 'model-2'], 'model-2'),
    ).toBe('model-3');
  });

  it('prefers the schema default over the configured default', () => {
    const models = ['model-1', 'model-2', 'model-4'];
    expect(resolveDefaultModelId(undefined, models, models, 'model-2', 'model-4')).toBe('model-4');
  });

  it('keeps the stored model over the schema default', () => {
    const models = ['model-3', 'model-4'];
    expect(resolveDefaultModelId('model-3', models, models, undefined, 'model-4')).toBe('model-3');
  });

  it('skips a schema default that is not loaded', () => {
    expect(resolveDefaultModelId(undefined, ['model-2'], ['model-2'], 'model-2', 'model-4')).toBe(
      'model-2',
    );
  });

  it('skips a schema default that does not support tools', () => {
    expect(
      resolveDefaultModelId(undefined, ['model-2'], ['model-2', 'model-4'], 'model-2', 'model-4'),
    ).toBe('model-2');
  });
});

describe('getQuickApp2FormData with application schema defaults', () => {
  const schemaDefaults = {
    deploymentId: 'model-2',
    temperature: 0.2,
    conversationStarters: {
      introText: 'Select an action',
      autoSubmit: false,
      chatMessageInputDisabled: true,
    },
    addAttachment: false,
    webFetch: false,
  };
  const models = ['model-1', 'model-2'];

  it('pre-fills a new app from the schema defaults', () => {
    const data = getQuickApp2FormData(undefined, models, models, undefined, schemaDefaults);

    expect(data).toMatchObject({
      model: 'model-2',
      temperature: 0.2,
      introText: 'Select an action',
      autoSubmit: false,
      chatMessageInputDisabled: true,
      addAttachment: false,
      webFetch: false,
    });
  });

  it('keeps the built-in defaults for what the schema does not provide', () => {
    const data = getQuickApp2FormData(undefined, models, models, undefined, {});

    expect(data).toMatchObject({
      model: 'model-1',
      autoSubmit: true,
      chatMessageInputDisabled: false,
      addAttachment: true,
      webFetch: true,
    });
    expect(data.introText).toBeUndefined();
  });

  it('keeps the stored feature values, including one saved as off', () => {
    const app = {
      applicationProperties: {
        features: { representation_tooling: null, web_fetch: { enabled: true } },
      },
    };

    const data = getQuickApp2FormData(app, models, models, undefined, {
      addAttachment: true,
      webFetch: false,
    });

    expect(data).toMatchObject({ addAttachment: false, webFetch: true });
  });

  it('does not apply conversation starters defaults to stored conversation starters', () => {
    const app = {
      applicationProperties: {
        conversation_starters: { starters: [{ title: 'Tips', text: 'Suggest' }] },
      },
    };

    const data = getQuickApp2FormData(app, models, models, undefined, schemaDefaults);

    expect(data.introText).toBeUndefined();
    expect(data).toMatchObject({ autoSubmit: true, chatMessageInputDisabled: false });
  });

  it('keeps the built-in temperature when the schema has none, and honours a zero default', () => {
    expect(getQuickApp2FormData(undefined, models, models, undefined, {}).temperature).toBe(0.5);
    expect(
      getQuickApp2FormData(undefined, models, models, undefined, { temperature: 0 }).temperature,
    ).toBe(0);
  });

  it('keeps the stored temperature over the schema default', () => {
    const app = {
      applicationProperties: { orchestrator: { deployment: { parameters: { temperature: 0.7 } } } },
    };

    const data = getQuickApp2FormData(app, models, models, undefined, schemaDefaults);

    expect(data.temperature).toBe(0.7);
  });

  it('keeps the stored model over the schema default', () => {
    const app = {
      applicationProperties: { orchestrator: { deployment: { deployment_id: 'model-1' } } },
    };

    const data = getQuickApp2FormData(app, models, models, undefined, schemaDefaults);

    expect(data.model).toBe('model-1');
  });
});

describe('getQuickApp2FormData', () => {
  it('pre-selects the first tool-supporting model when no default model is configured', () => {
    const data = getQuickApp2FormData(undefined, ['model-1', 'gpt-4o'], ['gpt-4o', 'model-1']);

    expect(data.model).toBe('model-1');
  });

  it('creates an empty-app form with a trailing blank starter that requires instructions', () => {
    const data = getQuickApp2FormData(undefined, ['model-1'], ['model-1'], 'model-1');

    expect(data).toMatchObject({
      model: 'model-1',
      instructions: '',
      temperature: 0.5,
      documentRelativeUrl: [],
      addOns: [],
      autoSubmit: true,
      timestamp: true,
      processLargeFiles: true,
      fileTools: true,
      addAttachment: true,
      webFetch: true,
    });
    expect(data.starters).toHaveLength(1);
    expect(data.starters[0]).toMatchObject({ title: '', text: '' });
    expect(data.starters[0].id).toEqual(expect.any(String));
    expect(QuickApp2Schema.safeParse(data).success).toBe(false);
    expect(QuickApp2Schema.safeParse({ ...data, instructions: 'Be helpful' }).success).toBe(true);
  });

  it('preserves toolset metadata when converting configured toolsets to form values', () => {
    const toolsets: AnyToolset[] = [
      {
        type: ToolsetTypes.DialApp,
        name: 'Weather',
        deployment_id: 'applications/weather',
      },
    ];

    const values = getAddOnsFormValue(toolsets);

    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({
      [AddOnSchemaKeys.id]: 'applications/weather',
      [AddOnSchemaKeys.tool]: toolsets[0],
      [AddOnSchemaKeys.isDialDeploymentTool]: false,
    });
  });

  it('builds toolsets from the simple representation', () => {
    const toolset = {
      type: ToolsetTypes.DialApp,
      name: 'Weather',
      deployment_id: 'applications/weather',
    } as AnyToolset;
    const formValue = getAddOnsFormValue([toolset]);
    const simpleToolsets = getQuickApp2Toolsets({
      allEntitiesMap: {},
      data: createForm({ addOns: formValue }),
      language: 'en',
    });
    expect(simpleToolsets).toEqual(
      expect.arrayContaining([
        expect.objectContaining(toolset),
        expect.objectContaining({ type: ToolsetTypes.DialDeployment }),
      ]),
    );
  });

  it('preserves attachment values from the app when building defaults', () => {
    const data = getQuickApp2FormData(
      {
        applicationProperties: {},
        inputAttachmentTypes: ['image/png'],
        maxInputAttachments: 4,
      },
      ['model-1'],
      ['model-1'],
      'model-1',
    );

    expect(data.inputAttachmentTypes).toEqual(['image/png']);
    expect(data.maxInputAttachments).toBe(4);
    expect(data.attachmentsEnabled).toBe(true);
  });

  it('starts with attachments disabled when the app has no attachment types', () => {
    const data = getQuickApp2FormData(undefined, ['model-1'], ['model-1'], 'model-1');

    expect(data.attachmentsEnabled).toBe(false);
    expect(data.inputAttachmentTypes).toEqual([]);
  });
});

type EntitiesMap = Parameters<typeof buildQuickApp2Config>[0]['allEntitiesMap'];

const buildConfig = (
  overrides: Partial<QuickApp2Form> = {},
  model: Record<string, unknown> = {},
  extraConfig?: Record<string, unknown>,
) =>
  buildQuickApp2Config({
    data: createForm({ ...overrides, extraConfig }),
    allEntitiesMap: { 'model-1': { id: 'model-1', ...model } } as unknown as EntitiesMap,
    language: 'en',
  });

describe('orchestrator temperature and process files', () => {
  it('defaults the temperature to 0.5 and process files to on for a new app', () => {
    const data = getQuickApp2FormData(undefined, ['model-1'], ['model-1'], 'model-1');

    expect(data.temperature).toBe(0.5);
    expect(data.processLargeFiles).toBe(true);
  });

  it('loads the temperature and turns process files on when an attachment strategy is saved', () => {
    const data = getQuickApp2FormData(
      {
        applicationProperties: {
          orchestrator: {
            deployment: { deployment_id: 'model-1', parameters: { temperature: 0.3 } },
            attachment_strategy: { type: 'lazy_on_demand' },
          },
        },
      },
      ['model-1'],
      ['model-1'],
    );

    expect(data.temperature).toBe(0.3);
    expect(data.processLargeFiles).toBe(true);
  });

  it('saves the temperature only for a model that supports it', () => {
    expect(
      buildConfig({ temperature: 0.3 }, { features: { temperature: true } }).orchestrator
        ?.deployment?.parameters,
    ).toEqual({ temperature: 0.3 });
    expect(
      buildConfig({ temperature: 0.3 }, { features: {} }).orchestrator?.deployment?.parameters,
    ).toBeUndefined();
  });

  it('saves the lazy attachment strategy or null for a model that accepts attachments', () => {
    const model = { inputAttachmentTypes: ['image/png'] };

    expect(
      buildConfig({ processLargeFiles: true }, model).orchestrator?.attachment_strategy,
    ).toEqual({ type: 'lazy_on_demand' });
    expect(
      buildConfig({ processLargeFiles: false }, model).orchestrator?.attachment_strategy,
    ).toBeNull();
  });

  it('keeps the loaded attachment strategy for a model that does not accept attachments', () => {
    const extraConfig = { orchestrator: { attachment_strategy: { type: 'lazy_on_demand' } } };

    expect(
      buildConfig({ processLargeFiles: false }, {}, extraConfig).orchestrator?.attachment_strategy,
    ).toEqual({ type: 'lazy_on_demand' });
  });
});

describe('conversation starters', () => {
  it('defaults to immediate send, an enabled chat input and no intro text', () => {
    const data = getQuickApp2FormData(undefined, ['model-1'], ['model-1'], 'model-1');

    expect(data.autoSubmit).toBe(true);
    expect(data.chatMessageInputDisabled).toBe(false);
    expect(data.introText).toBeUndefined();
  });

  it('loads saved starters followed by a blank row', () => {
    const data = getQuickApp2FormData(
      {
        applicationProperties: {
          conversation_starters: {
            intro_text: 'Hi!',
            auto_submit: false,
            chat_message_input_disabled: true,
            starters: [{ title: 'Travel tips', text: 'Suggest destinations' }],
          },
        },
      },
      ['model-1'],
      ['model-1'],
    );

    expect(data.introText).toBe('Hi!');
    expect(data.autoSubmit).toBe(false);
    expect(data.chatMessageInputDisabled).toBe(true);
    expect(data.starters.map(({ title, text }) => ({ title, text }))).toEqual([
      { title: 'Travel tips', text: 'Suggest destinations' },
      { title: '', text: '' },
    ]);
  });

  it('saves the starters settings and drops blank rows', () => {
    expect(
      buildConfig({
        introText: 'Hi!',
        autoSubmit: false,
        chatMessageInputDisabled: true,
        starters: [
          { id: '1', title: 'Travel tips', text: 'Suggest destinations' },
          { id: '2', title: '', text: '' },
        ],
      }).conversation_starters,
    ).toEqual({
      intro_text: 'Hi!',
      chat_message_input_disabled: true,
      auto_submit: false,
      starters: [{ title: 'Travel tips', text: 'Suggest destinations' }],
    });
  });

  it('still saves a partially filled starter', () => {
    expect(
      buildConfig({
        starters: [
          { id: '1', title: 'Travel tips', text: '' },
          { id: '2', title: '', text: 'Suggest destinations' },
        ],
      }).conversation_starters?.starters,
    ).toEqual([
      { title: 'Travel tips', text: '' },
      { title: '', text: 'Suggest destinations' },
    ]);
  });

  it('saves starters in list order', () => {
    expect(
      buildConfig({
        starters: [
          { id: 'b', title: 'B', text: 'b' },
          { id: 'a', title: 'A', text: 'a' },
          { id: 'c', title: 'C', text: 'c' },
          { id: 'blank', title: '', text: '' },
        ],
      }).conversation_starters?.starters.map(({ title }) => title),
    ).toEqual(['B', 'A', 'C']);
  });

  it('omits empty intro text', () => {
    expect(
      buildConfig({
        introText: '',
        starters: [{ id: '1', title: 'Travel tips', text: 'Suggest destinations' }],
      }).conversation_starters?.intro_text,
    ).toBeUndefined();
  });

  it('saves null when every starter row is blank', () => {
    expect(
      buildConfig({ starters: [{ id: '1', title: ' ', text: '' }] }).conversation_starters,
    ).toBeNull();
  });
});

describe('advanced settings', () => {
  it('accepts an empty or positive integer max attachments value', () => {
    expect(isValidMaxInputAttachments('')).toBe(true);
    expect(isValidMaxInputAttachments(undefined)).toBe(true);
    expect(isValidMaxInputAttachments(50)).toBe(true);
  });

  it('rejects a max attachments value that is not a positive integer', () => {
    expect(isValidMaxInputAttachments(0)).toBe(false);
    expect(isValidMaxInputAttachments(-1)).toBe(false);
    expect(isValidMaxInputAttachments(1.5)).toBe(false);
  });

  it('seeds the default attachment count for an app with types and no count', () => {
    const data = getQuickApp2FormData(
      { applicationProperties: {}, inputAttachmentTypes: ['image/png'] },
      ['model-1'],
      ['model-1'],
      'model-1',
    );

    expect(data.maxInputAttachments).toBe(DEFAULT_MAX_INPUT_ATTACHMENTS);
  });

  it.each([0, -2, 2.5, null, 'abc', ''])(
    'treats the host attachment count %j as missing and seeds the default',
    (maxInputAttachments) => {
      const data = getQuickApp2FormData(
        { applicationProperties: {}, inputAttachmentTypes: ['image/png'], maxInputAttachments },
        ['model-1'],
        ['model-1'],
        'model-1',
      );

      expect(data.maxInputAttachments).toBe(DEFAULT_MAX_INPUT_ATTACHMENTS);
    },
  );

  it('accepts a numeric string attachment count from the host', () => {
    const data = getQuickApp2FormData(
      { applicationProperties: {}, inputAttachmentTypes: ['image/png'], maxInputAttachments: '3' },
      ['model-1'],
      ['model-1'],
      'model-1',
    );

    expect(data.maxInputAttachments).toBe(3);
  });

  it('keeps a stored attachment count for an app without types and does not seed one', () => {
    const withCount = getQuickApp2FormData(
      { applicationProperties: {}, maxInputAttachments: 5 },
      ['model-1'],
      ['model-1'],
      'model-1',
    );
    const withoutCount = getQuickApp2FormData(
      { applicationProperties: {} },
      ['model-1'],
      ['model-1'],
      'model-1',
    );

    expect(withCount.maxInputAttachments).toBe(5);
    expect(withoutCount.maxInputAttachments).toBeUndefined();
  });

  it('treats an empty attachment count as invalid only when required', () => {
    expect(isValidMaxInputAttachments('')).toBe(true);
    expect(isValidMaxInputAttachments('', true)).toBe(false);
    expect(isValidMaxInputAttachments(undefined, true)).toBe(false);
    expect(isValidMaxInputAttachments(2, true)).toBe(true);
  });

  it('defaults time awareness and built-in file tools to on for a new app', () => {
    const data = getQuickApp2FormData(undefined, ['model-1'], ['model-1'], 'model-1');

    expect(data.timestamp).toBe(true);
    expect(data.fileTools).toBe(true);
    expect(data.maxInputAttachments).toBeUndefined();
  });

  it('saves time awareness and built-in file tools as features when on', () => {
    const features = buildConfig({ timestamp: true, fileTools: true }).features;

    expect(features?.timestamp).toEqual({ injection_strategy: 'tool_call' });
    expect(features?.dial_files).toEqual({});
  });

  it('saves null features when off and keeps other existing features', () => {
    const extraConfig = { features: { custom_feature: { enabled: true } } };
    const features = buildConfig({ timestamp: false, fileTools: false }, {}, extraConfig)
      .features as Record<string, unknown>;

    expect(features.timestamp).toBeNull();
    expect(features.dial_files).toBeNull();
    expect(features.custom_feature).toEqual({ enabled: true });
  });
});
