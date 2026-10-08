import { describe, expect, it } from 'vitest';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import {
  AddOnSchemaKeys,
  buildQuickApp2Config,
  QuickApp2Schema,
  getAddOnsFormValue,
  getQuickApp2FormData,
  getQuickApp2Toolsets,
  isValidMaxInputAttachments,
  resolveDefaultModelId,
  type QuickApp2Form,
} from '@/form/quickApp2Form';
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
        message: QuickAppEditorI18nKeys.InstructionsRequired,
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
            message: 'Not available agent selected. Please, change the agent to proceed',
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
            message: 'Selected model does not support tools',
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

  it('requires at least one attachment type while attachments are enabled', () => {
    const result = QuickApp2Schema.safeParse(createForm({ attachmentsEnabled: true }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          path: ['inputAttachmentTypes'],
          message: QuickAppEditorI18nKeys.AttachmentTypesRequired,
        }),
      ]);
    }
  });

  it.each([
    [
      'enabled with a type',
      { attachmentsEnabled: true, inputAttachmentTypes: ['application/pdf'] },
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
      temperature: 1,
      documentRelativeUrl: [],
      addOns: [],
      autoSubmit: true,
      timestamp: true,
      processLargeFiles: false,
      fileTools: false,
      addAttachment: false,
      webFetch: false,
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
  existingConfig?: Parameters<typeof buildQuickApp2Config>[0]['existingConfig'],
) =>
  buildQuickApp2Config({
    data: createForm(overrides),
    allEntitiesMap: { 'model-1': { id: 'model-1', ...model } } as unknown as EntitiesMap,
    existingConfig,
    language: 'en',
  });

describe('orchestrator temperature and process files', () => {
  it('defaults the temperature to 1 and process files to off for a new app', () => {
    const data = getQuickApp2FormData(undefined, ['model-1'], ['model-1'], 'model-1');

    expect(data.temperature).toBe(1);
    expect(data.processLargeFiles).toBe(false);
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
    const existingConfig = {
      orchestrator: { attachment_strategy: { type: 'lazy_on_demand' } },
    } as Parameters<typeof buildQuickApp2Config>[0]['existingConfig'];

    expect(
      buildConfig({ processLargeFiles: false }, {}, existingConfig).orchestrator
        ?.attachment_strategy,
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

  it('defaults time awareness to on and built-in file tools to off for a new app', () => {
    const data = getQuickApp2FormData(undefined, ['model-1'], ['model-1'], 'model-1');

    expect(data.timestamp).toBe(true);
    expect(data.fileTools).toBe(false);
    expect(data.maxInputAttachments).toBeUndefined();
  });

  it('saves time awareness and built-in file tools as features when on', () => {
    const features = buildConfig({ timestamp: true, fileTools: true }).features;

    expect(features?.timestamp).toEqual({ injection_strategy: 'tool_call' });
    expect(features?.dial_files).toEqual({});
  });

  it('saves null features when off and keeps other existing features', () => {
    const existingConfig = {
      features: { custom_feature: { enabled: true } },
    } as unknown as Parameters<typeof buildQuickApp2Config>[0]['existingConfig'];
    const features = buildConfig({ timestamp: false, fileTools: false }, {}, existingConfig)
      .features as Record<string, unknown>;

    expect(features.timestamp).toBeNull();
    expect(features.dial_files).toBeNull();
    expect(features.custom_feature).toEqual({ enabled: true });
  });
});
