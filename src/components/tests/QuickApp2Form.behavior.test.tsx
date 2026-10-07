import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { DIAL_EDITOR_TRIGGER_SAVE_EVENT } from '@/constants/editor';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import type { QuickApp2AllEntitiesMap } from '@/components/QuickApp2Form';
import type { QuickApp2Form } from '@/form/quickApp2Form';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';
import type { TriggerSaveGeneralPayload } from '@/types/editor-messages';

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
      toolsetsMap: {},
      mcpAgentsMap: {},
      status: 'ready' as 'loading' | 'ready',
    },
    model,
  };
});

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => testContext.appContext,
}));

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => testContext.dataContext,
}));

vi.mock('@/components/InstructionsSection/InstructionsSection', () => {
  const InstructionsTestField = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => <input aria-label="Instructions" value={value} onChange={(event) => onChange(event.target.value)} />;

  return { default: InstructionsTestField };
});

vi.mock('@/components/Orchestrator/ModelConfigurationSection/ModelConfigurationSection', () => {
  const ModelTestField = ({
    model,
    onModelChange,
    advancedSettings,
    onAdvancedSettingsSave,
  }: {
    model: string;
    onModelChange: (value: string) => void;
    advancedSettings: AdvancedSettingsValues;
    onAdvancedSettingsSave: (values: AdvancedSettingsValues) => void;
  }) => (
    <div>
      <input aria-label="Model" value={model} onChange={(event) => onModelChange(event.target.value)} />
      <button
        type="button"
        onClick={() => onAdvancedSettingsSave({ ...advancedSettings, fileTools: true, maxInputAttachments: 5 })}
      >
        Save changed advanced settings
      </button>
      <button type="button" onClick={() => onAdvancedSettingsSave(advancedSettings)}>
        Save unchanged advanced settings
      </button>
    </div>
  );

  return { default: ModelTestField };
});

vi.mock('@/components/QuickApp2FormLegacyFields/QuickApp2FormLegacyFields', () => {
  const LegacyFieldsTest = ({
    values,
    errors,
    startersSettingsTooltip,
    onAttachmentTypesChange,
  }: {
    values: QuickApp2Form;
    errors: Record<string, string | undefined>;
    startersSettingsTooltip?: string;
    onAttachmentTypesChange: (tags: string[], previousTags: string[]) => void;
  }) => (
    <div>
      <output data-testid="starters-hint">{startersSettingsTooltip ?? ''}</output>
      <button
        type="button"
        data-testid="add-invalid-mime"
        onClick={() => onAttachmentTypesChange(['not-a-mime'], values.inputAttachmentTypes)}
      />
      <output data-testid="attachment-error">{errors.inputAttachmentTypes}</output>
      <output data-testid="attachment-value">{values.inputAttachmentTypes.join('|')}</output>
    </div>
  );

  return { default: LegacyFieldsTest };
});
vi.mock('@/components/ContextAndTools/ContextAndToolsSection', () => ({ default: () => null }));
vi.mock('@/components/AgentSkills/AgentSkillsFormSection', () => ({ default: () => null }));
vi.mock('@/components/UserAttachments/UserAttachmentsSection', () => ({ default: () => null }));
vi.mock('@/components/ConversationStarters/ConversationStartersSection', () => ({
  default: () => null,
}));

import { QuickApp2Form as QuickApp2FormComponent } from '../QuickApp2Form';

let root: Root;
let container: HTMLDivElement;

const getButtonByText = (text: string) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === text) as HTMLButtonElement;

const renderForm = (
  props: { onSave?: Mock<FormSaveHandler>; readonly?: boolean; key?: string } = {},
) => {
  const onSave = props.onSave ?? vi.fn<FormSaveHandler>();
  const onDirtyChange = vi.fn();
  const onModelReady = vi.fn();

  act(() => {
    root.render(
      <QuickApp2FormComponent
        key={props.key}
        onSave={onSave}
        onDirtyChange={onDirtyChange}
        onModelReady={onModelReady}
        readonly={props.readonly}
      />,
    );
  });

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
  const form = container.querySelector('form');
  expect(form).not.toBeNull();

  await act(async () => {
    form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
};

const triggerSave = async (detail: { isAutoSave: boolean; ignoreDirty?: boolean }) => {
  await act(async () => {
    window.dispatchEvent(new CustomEvent(DIAL_EDITOR_TRIGGER_SAVE_EVENT, { detail }));
    await Promise.resolve();
  });
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  testContext.appContext.app = { id: 'app', applicationProperties: {} };
  testContext.dataContext = {
    models: [testContext.model],
    modelsMap: { [testContext.model.id]: testContext.model },
    toolsetsMap: {},
    mcpAgentsMap: {},
    status: 'ready',
  };
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('QuickApp2Form observable behavior', () => {
  it('submits valid form data and suppresses invalid submissions', async () => {
    const { onSave } = renderForm();

    await submitForm();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      model: 'model-1',
      instructions: '',
    });

    await dispatchInput(
      container.querySelector('[aria-label="Model"]') as HTMLInputElement,
      'missing-model',
    );
    await submitForm();

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('reports dirty transitions when a controlled field changes and is restored', async () => {
    const { onDirtyChange } = renderForm();
    const instructions = container.querySelector('[aria-label="Instructions"]') as HTMLInputElement;

    await dispatchInput(instructions, 'Updated instructions');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await dispatchInput(instructions, '');
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('applies saved Advanced Settings to the form and marks it dirty', async () => {
    const { onSave, onDirtyChange } = renderForm();

    act(() => getButtonByText('Save changed advanced settings').click());
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await submitForm();
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ fileTools: true, maxInputAttachments: 5, timestamp: true }),
      expect.anything(),
      false,
      undefined,
    );
  });

  it('keeps the form clean when Advanced Settings are saved unchanged', () => {
    const { onDirtyChange } = renderForm();

    act(() => getButtonByText('Save unchanged advanced settings').click());
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('skips clean autosave, saves dirty autosave, and honors ignoreDirty', async () => {
    const { onSave } = renderForm();

    await triggerSave({ isAutoSave: true });
    expect(onSave).not.toHaveBeenCalled();

    await dispatchInput(
      container.querySelector('[aria-label="Instructions"]') as HTMLInputElement,
      'Changed',
    );
    await triggerSave({ isAutoSave: true });
    expect(onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(
        <QuickApp2FormComponent
          key="clean-again"
          onSave={onSave}
          onDirtyChange={vi.fn()}
          onModelReady={vi.fn()}
        />,
      );
      await Promise.resolve();
    });
    await triggerSave({ isAutoSave: true, ignoreDirty: true });
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('ignores host-triggered saves while read-only', async () => {
    const { onSave } = renderForm({ readonly: true });

    await triggerSave({ isAutoSave: false });

    expect(onSave).not.toHaveBeenCalled();
  });

  it('restores the form baseline when the form is remounted for reset', async () => {
    const { onDirtyChange } = renderForm({ key: 'before-reset' });
    const instructions = container.querySelector('[aria-label="Instructions"]') as HTMLInputElement;

    await dispatchInput(instructions, 'Unsaved change');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    act(() => {
      root.render(
        <QuickApp2FormComponent
          key="after-reset"
          onSave={vi.fn()}
          onDirtyChange={onDirtyChange}
          onModelReady={vi.fn()}
        />,
      );
    });

    expect((container.querySelector('[aria-label="Instructions"]') as HTMLInputElement).value).toBe('');
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('rolls back invalid MIME tags', async () => {
    renderForm();

    await act(async () => {
      container.querySelector('[data-testid="add-invalid-mime"]')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="attachment-error"]')?.textContent).toBe(
      QuickAppEditorI18nKeys.PleaseMatchTheMimeFormat,
    );
    expect(container.querySelector('[data-testid="attachment-value"]')?.textContent).toBe('');
  });

  it('resolves the model and reports ready when model data arrives asynchronously', () => {
    testContext.dataContext = {
      models: [],
      modelsMap: {},
      toolsetsMap: {},
      mcpAgentsMap: {},
      status: 'loading',
    };
    const { onModelReady } = renderForm();

    expect((container.querySelector('[aria-label="Model"]') as HTMLInputElement).value).toBe('');
    expect(onModelReady).not.toHaveBeenCalled();

    testContext.dataContext = {
      models: [testContext.model],
      modelsMap: { [testContext.model.id]: testContext.model },
      toolsetsMap: {},
      mcpAgentsMap: {},
      status: 'ready',
    };
    act(() => {
      root.render(
        <QuickApp2FormComponent
          onSave={vi.fn()}
          onDirtyChange={vi.fn()}
          onModelReady={onModelReady}
        />,
      );
    });

    expect((container.querySelector('[aria-label="Model"]') as HTMLInputElement).value).toBe('model-1');
    expect(onModelReady).toHaveBeenCalled();
  });

  it('hints that a starter is required until the app has a complete starter', () => {
    renderForm();

    expect(container.querySelector('[data-testid="starters-hint"]')?.textContent).toBe(
      QuickAppEditorI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings,
    );
  });

  it('drops the starters hint for an app with a complete starter', () => {
    testContext.appContext.app = {
      id: 'app',
      applicationProperties: {
        conversation_starters: { starters: [{ title: 'Travel tips', text: 'Suggest destinations' }] },
      },
    };

    renderForm();

    expect(container.querySelector('[data-testid="starters-hint"]')?.textContent).toBe('');
  });

  it('shows the shared-application hint on the starters settings of a shared app', () => {
    testContext.appContext.app = { id: 'app', applicationProperties: {}, isShared: true };

    renderForm();

    expect(container.querySelector('[data-testid="starters-hint"]')?.textContent).toBe(
      QuickAppEditorI18nKeys.CannotChangeSharedApp,
    );
  });
});
