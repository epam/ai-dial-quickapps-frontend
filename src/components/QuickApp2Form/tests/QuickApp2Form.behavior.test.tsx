import { act } from 'react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { DIAL_EDITOR_TRIGGER_SAVE_EVENT } from '@/constants/editor';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import type { QuickApp2AllEntitiesMap } from '@/components/QuickApp2Form/QuickApp2Form';
import type { QuickApp2Form } from '@/form/quickApp2Form';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import type { ConversationStartersValues } from '@/types/conversation-starters';
import type { TriggerSaveGeneralPayload } from '@/types/editor-messages';
import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

type FormSaveHandler = (
  data: QuickApp2Form,
  allEntitiesMap: QuickApp2AllEntitiesMap,
  isAutoSave?: boolean,
  general?: TriggerSaveGeneralPayload,
) => void;

const testContext = vi.hoisted(() => {
  const model = {
    id: 'model-1',
    reference: 'model-1',
    name: 'Model 1',
    type: 'model' as const,
    features: { tools: true },
    inputAttachmentTypes: ['image/png'],
  };

  return {
    appContext: {
      app: { id: 'app', applicationProperties: {} } as {
        id: string;
        applicationProperties: unknown;
        isShared?: boolean;
        sharedWithMe?: boolean;
        inputAttachmentTypes?: string[];
        maxInputAttachments?: unknown;
      },
      settings: {
        defaultModelId: 'model-1',
        isCodeInterpreterEnabled: false,
        isWebFetchEnabled: false,
        isAddAttachmentEnabled: false,
      },
    },
    dataContext: {
      models: [model],
      modelsMap: { [model.id]: model },
      toolsets: [],
      toolsetsMap: {},
      mcpAgents: [],
      mcpAgentsMap: {},
      status: 'ready' as 'loading' | 'ready',
    },
    model,
  };
});

vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => testContext.appContext,
}));

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => testContext.dataContext,
}));

vi.mock('@/components/InstructionsSection/InstructionsSection', () => {
  const InstructionsTestField = ({
    value,
    error,
    onChange,
  }: {
    value: string;
    error?: string;
    onChange: (value: string) => void;
  }) => (
    <>
      <input
        aria-label="Instructions"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <p>{error}</p>}
    </>
  );

  return { default: InstructionsTestField };
});

vi.mock('@/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection', () => {
  const ModelTestField = ({
    model,
    onModelChange,
    advancedSettings,
    onAdvancedSettingsSave,
    isAttachmentsEnabled,
    onAttachmentsEnabledChange,
    inputAttachmentTypes,
    onInputAttachmentTypesChange,
    errors,
  }: {
    model: string;
    onModelChange: (value: string) => void;
    advancedSettings: AdvancedSettingsValues;
    onAdvancedSettingsSave: (values: AdvancedSettingsValues) => void;
    isAttachmentsEnabled: boolean;
    onAttachmentsEnabledChange: (isEnabled: boolean) => void;
    inputAttachmentTypes: string[];
    onInputAttachmentTypesChange: (mimeTypes: string[]) => void;
    errors: Record<string, string | undefined>;
  }) => (
    <div>
      <output data-testid="attachments-enabled">{String(isAttachmentsEnabled)}</output>
      <output data-testid="attachment-value">{inputAttachmentTypes.join('|')}</output>
      <output data-testid="max-value">{String(advancedSettings.maxInputAttachments ?? '')}</output>
      <button
        type="button"
        onClick={() => onAdvancedSettingsSave({ ...advancedSettings, maxInputAttachments: 1 })}
      >
        Save max 1
      </button>
      <output data-testid="attachment-error">{errors.inputAttachmentTypes ?? ''}</output>
      <button type="button" onClick={() => onAttachmentsEnabledChange(true)}>
        Turn attachments on
      </button>
      <button type="button" onClick={() => onAttachmentsEnabledChange(false)}>
        Turn attachments off
      </button>
      <button type="button" onClick={() => onInputAttachmentTypesChange(['application/pdf'])}>
        Select PDF
      </button>
      <input
        aria-label="Model"
        value={model}
        onChange={(event) => onModelChange(event.target.value)}
      />
      <button
        type="button"
        onClick={() =>
          onAdvancedSettingsSave({ ...advancedSettings, fileTools: true, maxInputAttachments: 5 })
        }
      >
        Save changed advanced settings
      </button>
      <button type="button" onClick={() => onAdvancedSettingsSave(advancedSettings)}>
        Save unchanged advanced settings
      </button>
      <button
        type="button"
        onClick={() =>
          onAdvancedSettingsSave({
            ...advancedSettings,
            temperature: 0.3,
            processLargeFiles: !advancedSettings.processLargeFiles,
          })
        }
      >
        Save changed orchestrator settings
      </button>
    </div>
  );

  return { default: ModelTestField };
});

vi.mock('@/components/AgentSkills/AgentSkillsFormSection/AgentSkillsFormSection', () => {
  // Stands in for the skill details popup's Delete, which detaches one skill.
  const SkillsTestSection = ({
    value,
    onChange,
  }: {
    value: string[];
    onChange: (value: string[]) => void;
  }) => (
    <div>
      <output data-testid="skills-value">{value.join('|')}</output>
      <button
        type="button"
        onClick={() => onChange(value.filter((id) => id !== 'skills/public/b'))}
      >
        Delete skill b
      </button>
    </div>
  );

  return { default: SkillsTestSection };
});
vi.mock('@/components/KnowledgeBase/KnowledgeBaseRow/KnowledgeBaseRow', () => {
  const KnowledgeBaseTestRow = ({
    files,
    isReadonly,
    onAddFiles,
    onRemoveFile,
  }: {
    files: string[];
    isReadonly: boolean;
    onAddFiles: (files: string[]) => void;
    onRemoveFile: (file: string) => void;
  }) => (
    <div>
      <output data-testid="knowledge-readonly">{String(isReadonly)}</output>
      <output data-testid="knowledge-files">{files.join('|')}</output>
      <button
        type="button"
        onClick={() => onAddFiles(['files/abc/a.pdf', 'files/abc/new%20file.pdf'])}
      >
        Add knowledge files
      </button>
      <button type="button" onClick={() => onRemoveFile('files/abc/a.pdf')}>
        Remove knowledge file
      </button>
    </div>
  );

  return { default: KnowledgeBaseTestRow };
});
vi.mock('@/components/ConversationStarters/ConversationStartersRow/ConversationStartersRow', () => {
  const ConversationStartersTestRow = ({
    values,
    isReadonly,
    onSave,
  }: {
    values: ConversationStartersValues;
    isReadonly: boolean;
    onSave: (values: ConversationStartersValues) => void;
  }) => (
    <div>
      <output data-testid="starters-readonly">{String(isReadonly)}</output>
      <output data-testid="starters-titles">
        {values.starters.map((starter) => starter.title).join('|')}
      </output>
      <button
        type="button"
        onClick={() =>
          onSave({
            starters: [
              { id: 's1', title: 'Travel tips', text: 'Suggest destinations' },
              { id: 's2', title: '', text: '' },
            ],
            introText: 'Hi!',
            autoSubmit: false,
            chatMessageInputDisabled: true,
          })
        }
      >
        Save changed starters
      </button>
      <button type="button" onClick={() => onSave(values)}>
        Save unchanged starters
      </button>
    </div>
  );

  return { default: ConversationStartersTestRow };
});

import { QuickApp2Form as QuickApp2FormComponent } from '../QuickApp2Form';

// Instructions are required, so a savable app needs a non-empty system prompt.
const SAVED_ORCHESTRATOR = { system_prompt: { content: 'Be helpful' } };

const dom = setupTestRoot();

const renderForm = (
  props: {
    onSave?: Mock<FormSaveHandler>;
    onValidationError?: Mock<(messages: string[]) => void>;
    onValidityChange?: Mock<(isValid: boolean) => void>;
    isReadonly?: boolean;
    key?: string;
  } = {},
) => {
  const onSave = props.onSave ?? vi.fn<FormSaveHandler>();
  const onDirtyChange = vi.fn();
  const onModelReady = vi.fn();

  dom.render(
    <QuickApp2FormComponent
      key={props.key}
      onSave={onSave}
      onDirtyChange={onDirtyChange}
      onValidationError={props.onValidationError}
      onValidityChange={props.onValidityChange}
      onModelReady={onModelReady}
      isReadonly={props.isReadonly}
    />,
  );

  return { onSave, onDirtyChange, onModelReady };
};

const dispatchInput = async (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
};

const submitForm = async () => {
  const form = dom.container.querySelector('form');
  expect(form).not.toBeNull();

  await act(async () => {
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
};

const triggerSave = async (detail: { isAutoSave: boolean; shouldIgnoreDirty?: boolean }) => {
  await act(async () => {
    window.dispatchEvent(new CustomEvent(DIAL_EDITOR_TRIGGER_SAVE_EVENT, { detail }));
    await Promise.resolve();
  });
};

beforeEach(() => {
  testContext.appContext.app = {
    id: 'app',
    applicationProperties: { orchestrator: SAVED_ORCHESTRATOR },
  };
  testContext.dataContext = {
    models: [testContext.model],
    modelsMap: { [testContext.model.id]: testContext.model },
    toolsets: [],
    toolsetsMap: {},
    mcpAgents: [],
    mcpAgentsMap: {},
    status: 'ready',
  };
});

describe('QuickApp2Form observable behavior', () => {
  it('submits valid form data and suppresses invalid submissions', async () => {
    const { onSave } = renderForm();

    await submitForm();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      model: 'model-1',
      instructions: 'Be helpful',
    });

    await dispatchInput(
      dom.container.querySelector('[aria-label="Model"]') as HTMLInputElement,
      'missing-model',
    );
    await submitForm();

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('reports dirty transitions when a controlled field changes and is restored', async () => {
    const { onDirtyChange } = renderForm();
    const instructions = dom.container.querySelector(
      '[aria-label="Instructions"]',
    ) as HTMLInputElement;

    await dispatchInput(instructions, 'Updated instructions');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await dispatchInput(instructions, 'Be helpful');
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('blocks save with empty instructions and shows the error only after an edit or save', async () => {
    testContext.appContext.app = { id: 'app', applicationProperties: {} };
    const { onSave } = renderForm();

    expect(dom.container.textContent).not.toContain(QuickAppEditorI18nKeys.InstructionsRequired);

    await submitForm();
    expect(onSave).not.toHaveBeenCalled();
    expect(dom.container.textContent).toContain(QuickAppEditorI18nKeys.InstructionsRequired);

    const instructions = dom.container.querySelector(
      '[aria-label="Instructions"]',
    ) as HTMLInputElement;
    await dispatchInput(instructions, 'Be helpful');
    expect(dom.container.textContent).not.toContain(QuickAppEditorI18nKeys.InstructionsRequired);

    await submitForm();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('reports validity changes as instructions are blanked and filled', async () => {
    const onValidityChange = vi.fn<(isValid: boolean) => void>();
    renderForm({ onValidityChange });
    const instructions = dom.container.querySelector(
      '[aria-label="Instructions"]',
    ) as HTMLInputElement;

    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    await dispatchInput(instructions, '');
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
    await dispatchInput(instructions, 'Be helpful');
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it('reports validation errors for a blocked manual save but not for an auto-save', async () => {
    testContext.appContext.app = { id: 'app', applicationProperties: {} };
    const onValidationError = vi.fn<(messages: string[]) => void>();
    const { onSave } = renderForm({ onValidationError });

    await triggerSave({ isAutoSave: true, shouldIgnoreDirty: true });
    expect(onValidationError).not.toHaveBeenCalled();

    await triggerSave({ isAutoSave: false });
    expect(onSave).not.toHaveBeenCalled();
    expect(onValidationError).toHaveBeenCalledWith([QuickAppEditorI18nKeys.InstructionsRequired]);
  });

  it('applies saved Advanced Settings to the form and marks it dirty', async () => {
    const { onSave, onDirtyChange } = renderForm();

    click(getButton('Save changed advanced settings'));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await submitForm();
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ fileTools: true, maxInputAttachments: 5, timestamp: true }),
      expect.anything(),
      false,
      undefined,
    );
  });

  it('applies temperature and process files saved from Advanced Settings and marks the form dirty', async () => {
    const { onSave, onDirtyChange } = renderForm();

    click(getButton('Save changed orchestrator settings'));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await submitForm();
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ temperature: 0.3, processLargeFiles: true }),
      expect.anything(),
      false,
      undefined,
    );
  });

  it('keeps the form clean when Advanced Settings are saved unchanged', () => {
    const { onDirtyChange } = renderForm();

    click(getButton('Save unchanged advanced settings'));
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('skips clean autosave, saves dirty autosave, and honors ignoreDirty', async () => {
    const { onSave } = renderForm();

    await triggerSave({ isAutoSave: true });
    expect(onSave).not.toHaveBeenCalled();

    await dispatchInput(
      dom.container.querySelector('[aria-label="Instructions"]') as HTMLInputElement,
      'Changed',
    );
    await triggerSave({ isAutoSave: true });
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      dom.root.render(
        <QuickApp2FormComponent
          key="clean-again"
          onSave={onSave}
          onDirtyChange={vi.fn()}
          onModelReady={vi.fn()}
        />,
      );
      await Promise.resolve();
    });
    await triggerSave({ isAutoSave: true, shouldIgnoreDirty: true });
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('detaching a skill makes the form dirty and saves the remaining skills', async () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: {
        orchestrator: SAVED_ORCHESTRATOR,
        skills: ['a', 'b', 'c'].map((name) => ({
          type: 'dial-skill',
          url: `skills/public/${name}`,
        })),
      },
    };
    const { onSave, onDirtyChange } = renderForm();

    expect(dom.container.querySelector('[data-testid="skills-value"]')?.textContent).toBe(
      'skills/public/a|skills/public/b|skills/public/c',
    );

    await act(async () => {
      [...dom.container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Delete skill b')
        ?.click();
      await Promise.resolve();
    });

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await submitForm();

    expect(onSave.mock.calls[0][0].agentSkills).toEqual(['skills/public/a', 'skills/public/c']);
  });

  it('ignores host-triggered saves while read-only', async () => {
    const { onSave } = renderForm({ isReadonly: true });

    await triggerSave({ isAutoSave: false });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('restores the form baseline when the form is remounted for reset', async () => {
    const { onDirtyChange } = renderForm({ key: 'before-reset' });
    const instructions = dom.container.querySelector(
      '[aria-label="Instructions"]',
    ) as HTMLInputElement;

    await dispatchInput(instructions, 'Unsaved change');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    dom.render(
      <QuickApp2FormComponent
        key="after-reset"
        onSave={vi.fn()}
        onDirtyChange={onDirtyChange}
        onModelReady={vi.fn()}
      />,
    );

    expect(
      (dom.container.querySelector('[aria-label="Instructions"]') as HTMLInputElement).value,
    ).toBe('Be helpful');
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('submits the loaded attachment types unchanged', async () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: { orchestrator: SAVED_ORCHESTRATOR },
      inputAttachmentTypes: ['audio/mpeg', 'image/*'],
    };
    const { onSave, onDirtyChange } = renderForm();

    expect(dom.container.querySelector('[data-testid="attachment-value"]')?.textContent).toBe(
      'audio/mpeg|image/*',
    );
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);

    await submitForm();
    expect(onSave.mock.calls[0][0]).toMatchObject({
      inputAttachmentTypes: ['audio/mpeg', 'image/*'],
    });
  });

  it('submits no attachment types and marks the form dirty after attachments are turned off', async () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: { orchestrator: SAVED_ORCHESTRATOR },
      inputAttachmentTypes: ['application/pdf'],
    };
    const { onSave, onDirtyChange } = renderForm();

    click(getButton('Turn attachments off'));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(dom.container.querySelector('[data-testid="attachments-enabled"]')?.textContent).toBe(
      'false',
    );

    await submitForm();
    expect(onSave.mock.calls[0][0]).toMatchObject({ inputAttachmentTypes: [] });
  });

  it('blocks save and auto-save while attachments are enabled without a type', async () => {
    const { onSave, onDirtyChange } = renderForm();

    click(getButton('Turn attachments on'));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(dom.container.querySelector('[data-testid="attachment-error"]')?.textContent).toBe(
      QuickAppEditorI18nKeys.AttachmentTypesRequired,
    );

    await submitForm();
    await triggerSave({ isAutoSave: true });
    expect(onSave).not.toHaveBeenCalled();

    click(getButton('Select PDF'));
    expect(dom.container.querySelector('[data-testid="attachment-error"]')?.textContent).toBe('');

    await submitForm();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ inputAttachmentTypes: ['application/pdf'] });
  });

  it('keeps the form clean when attachments are turned on and off without a selection', () => {
    const { onDirtyChange } = renderForm();

    click(getButton('Turn attachments on'));
    click(getButton('Turn attachments off'));

    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(dom.container.querySelector('[data-testid="attachment-error"]')?.textContent).toBe('');
  });

  const getMaxValue = () => dom.container.querySelector('[data-testid="max-value"]')?.textContent;

  it('seeds the default max when attachments are turned on without a max', async () => {
    const { onSave, onDirtyChange } = renderForm();

    click(getButton('Turn attachments on'));
    expect(getMaxValue()).toBe('1');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    click(getButton('Select PDF'));
    await submitForm();
    expect(onSave.mock.calls[0][0]).toMatchObject({ maxInputAttachments: 1 });
  });

  it('keeps an existing max when attachments are turned on', () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: { orchestrator: SAVED_ORCHESTRATOR },
      maxInputAttachments: 5,
    };
    renderForm();

    click(getButton('Turn attachments on'));
    expect(getMaxValue()).toBe('5');

    click(getButton('Turn attachments off'));
    expect(getMaxValue()).toBe('5');
  });

  it('restores the max set in Advanced settings when attachments are turned off and on', () => {
    renderForm();

    click(getButton('Save changed advanced settings'));
    click(getButton('Turn attachments on'));
    click(getButton('Turn attachments off'));
    click(getButton('Turn attachments on'));

    expect(getMaxValue()).toBe('5');
  });

  it('keeps a max of 1 confirmed in Advanced settings when attachments are turned off', () => {
    const { onDirtyChange } = renderForm();

    click(getButton('Turn attachments on'));
    click(getButton('Save max 1'));
    click(getButton('Turn attachments off'));

    expect(getMaxValue()).toBe('1');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it('keeps the seeded max after a save when attachments are turned off', async () => {
    renderForm();

    click(getButton('Turn attachments on'));
    click(getButton('Select PDF'));
    await submitForm();
    click(getButton('Turn attachments off'));

    expect(getMaxValue()).toBe('1');
  });

  it('loads an app with attachment types and no max with the default max and a clean form', () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: { orchestrator: SAVED_ORCHESTRATOR },
      inputAttachmentTypes: ['application/pdf'],
    };
    const { onDirtyChange } = renderForm();

    expect(getMaxValue()).toBe('1');
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('resolves the model and reports ready when model data arrives asynchronously', () => {
    testContext.dataContext = {
      models: [],
      modelsMap: {},
      toolsets: [],
      toolsetsMap: {},
      mcpAgents: [],
      mcpAgentsMap: {},
      status: 'loading',
    };
    const { onModelReady } = renderForm();

    expect((dom.container.querySelector('[aria-label="Model"]') as HTMLInputElement).value).toBe(
      '',
    );
    expect(onModelReady).not.toHaveBeenCalled();

    testContext.dataContext = {
      models: [testContext.model],
      modelsMap: { [testContext.model.id]: testContext.model },
      toolsets: [],
      toolsetsMap: {},
      mcpAgents: [],
      mcpAgentsMap: {},
      status: 'ready',
    };
    dom.render(
      <QuickApp2FormComponent
        onSave={vi.fn()}
        onDirtyChange={vi.fn()}
        onModelReady={onModelReady}
      />,
    );

    expect((dom.container.querySelector('[aria-label="Model"]') as HTMLInputElement).value).toBe(
      'model-1',
    );
    expect(onModelReady).toHaveBeenCalled();
  });

  it('passes saved conversation starters to the Add-ons row', () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: {
        orchestrator: SAVED_ORCHESTRATOR,
        conversation_starters: {
          starters: [
            { title: 'B', text: 'b' },
            { title: 'A', text: 'a' },
          ],
        },
      },
    };

    renderForm();

    expect(dom.container.querySelector('[data-testid="starters-titles"]')?.textContent).toBe(
      'B|A|',
    );
  });

  it('applies saved conversation starters to the form and marks it dirty', async () => {
    const { onSave, onDirtyChange } = renderForm();

    click(getButton('Save changed starters'));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await submitForm();
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({
        starters: [
          { id: 's1', title: 'Travel tips', text: 'Suggest destinations' },
          { id: 's2', title: '', text: '' },
        ],
        introText: 'Hi!',
        autoSubmit: false,
        chatMessageInputDisabled: true,
      }),
      expect.anything(),
      false,
      undefined,
    );
  });

  it('keeps the form clean when conversation starters are saved unchanged', () => {
    const { onDirtyChange } = renderForm();

    click(getButton('Save unchanged starters'));
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('keeps the conversation starters row editable for a shared app', () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: { orchestrator: SAVED_ORCHESTRATOR },
      isShared: true,
      sharedWithMe: true,
    };

    renderForm();

    expect(dom.container.querySelector('[data-testid="starters-readonly"]')?.textContent).toBe(
      'false',
    );
  });

  it('passes saved context files to the Knowledge base row', () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: {
        contexts: [
          { type: 'file', url: 'files/abc/a.pdf' },
          { type: 'file', url: 'files/abc/b.pdf' },
        ],
      },
    };

    renderForm();

    expect(dom.container.querySelector('[data-testid="knowledge-files"]')?.textContent).toBe(
      'files/abc/a.pdf|files/abc/b.pdf',
    );
  });

  it('adds decoded, de-duplicated knowledge files, marks the form dirty and saves them', async () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: {
        orchestrator: SAVED_ORCHESTRATOR,
        contexts: [{ type: 'file', url: 'files/abc/a.pdf' }],
      },
    };
    const { onSave, onDirtyChange } = renderForm();

    click(getButton('Add knowledge files'));

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(dom.container.querySelector('[data-testid="knowledge-files"]')?.textContent).toBe(
      'files/abc/a.pdf|files/abc/new file.pdf',
    );

    await submitForm();
    expect(onSave.mock.calls[0][0].documentRelativeUrl).toEqual([
      'files/abc/a.pdf',
      'files/abc/new file.pdf',
    ]);
  });

  it('removes a knowledge file, marks the form dirty and saves the remaining ones', async () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: {
        orchestrator: SAVED_ORCHESTRATOR,
        contexts: [
          { type: 'file', url: 'files/abc/a.pdf' },
          { type: 'file', url: 'files/abc/b.pdf' },
        ],
      },
    };
    const { onSave, onDirtyChange } = renderForm();

    click(getButton('Remove knowledge file'));

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await submitForm();
    expect(onSave.mock.calls[0][0].documentRelativeUrl).toEqual(['files/abc/b.pdf']);
  });

  it.each([{ isShared: true }, { sharedWithMe: true }])(
    'keeps the knowledge base row editable for a shared app (%o)',
    (sharedFlags) => {
      testContext.appContext.app = { id: 'app', applicationProperties: {}, ...sharedFlags };

      renderForm();

      expect(dom.container.querySelector('[data-testid="knowledge-readonly"]')?.textContent).toBe(
        'false',
      );
    },
  );
});
