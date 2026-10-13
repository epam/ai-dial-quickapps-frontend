import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';

import ModelConfigurationSection from '../ModelConfigurationSection';
import { ApplicationEditorI18nKeys, ChatSettingsI18nKeys } from '@/constants/translation-keys';

let modelsMap: Record<string, { allowTemperature?: boolean }> = {};

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ modelsMap }),
}));
vi.mock('@/utils/application', () => ({
  doesModelAllowTemperature: (model: { allowTemperature?: boolean }) =>
    model.allowTemperature !== false,
}));
vi.mock('@/components/Orchestrator/DefaultModelBlock/DefaultModelBlock', () => ({
  DefaultModelBlock: ({ isDisabled }: { isDisabled?: boolean }) => (
    <button type="button" disabled={isDisabled}>
      Model picker
    </button>
  ),
}));
vi.mock('@/components/Settings/SettingsSection/SettingsSection', () => ({
  default: ({
    isReadonly,
    isTemperatureAvailable,
    isProcessLargeFilesAvailable,
  }: {
    isReadonly: boolean;
    isTemperatureAvailable: boolean;
    isProcessLargeFilesAvailable: boolean;
  }) => (
    <div
      data-testid="settings-section"
      data-readonly={String(isReadonly)}
      data-temperature={String(isTemperatureAvailable)}
      data-process-files={String(isProcessLargeFilesAvailable)}
    />
  ),
}));
vi.mock('@/components/Attachments/AttachmentsSection/AttachmentsSection', () => ({
  default: ({ value, isReadonly }: { value: string[]; isReadonly: boolean }) => (
    <div
      data-testid="attachments-section"
      data-value={value.join(',')}
      data-readonly={String(isReadonly)}
    />
  ),
}));

interface TestFormProps {
  isReadonly?: boolean;
  isProcessLargeFilesAvailable?: boolean;
}

const TestForm = ({ isReadonly = false, isProcessLargeFilesAvailable = true }: TestFormProps) => (
  <ModelConfigurationSection
    model="model-id"
    onModelChange={vi.fn()}
    errors={{}}
    isReadonly={isReadonly}
    isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
    isCodeInterpreterEnabled={false}
    isAddAttachmentEnabled={false}
    isWebFetchEnabled={false}
    advancedSettings={{
      temperature: 0.5,
      maxInputAttachments: undefined,
      timestamp: true,
      fileTools: false,
      processLargeFiles: false,
      codeInterpreter: false,
      addAttachment: false,
      webFetch: false,
    }}
    onAdvancedSettingsSave={vi.fn()}
    isAttachmentsEnabled
    onAttachmentsEnabledChange={vi.fn()}
    inputAttachmentTypes={['application/pdf']}
    onInputAttachmentTypesChange={vi.fn()}
  />
);

const dom = setupTestRoot();

const getSettings = () =>
  dom.container.querySelector('[data-testid="settings-section"]') as HTMLElement;

beforeEach(() => {
  modelsMap = { 'model-id': {} };
});

describe('ModelConfigurationSection', () => {
  it('renders the Default model, then Settings, then Attachments', () => {
    dom.render(<TestForm />);

    expect(dom.container.textContent).toContain(ApplicationEditorI18nKeys.Configuration);
    expect(
      dom.container.querySelector('section[aria-labelledby="model-configuration-heading"]')
        ?.className,
    ).toContain('px-8');
    expect(getSettings().previousElementSibling?.textContent).toBe('Model picker');
    const attachments = dom.container.querySelector('[data-testid="attachments-section"]');
    expect(attachments?.previousElementSibling).toBe(getSettings());
    expect(attachments?.getAttribute('data-value')).toBe('application/pdf');
  });

  it('has no inline temperature or process-files controls', () => {
    dom.render(<TestForm />);

    expect(dom.container.querySelector('[role="slider"]')).toBeNull();
    expect(dom.container.querySelector('[role="switch"]')).toBeNull();
    expect(dom.container.textContent).not.toContain(ChatSettingsI18nKeys.TemperatureLabel);
    expect(dom.container.textContent).not.toContain('Process files');
    expect(dom.container.querySelectorAll('h3')).toHaveLength(0);
  });

  it('tells Settings that temperature is available for a supporting model', () => {
    dom.render(<TestForm />);

    expect(getSettings().getAttribute('data-temperature')).toBe('true');
  });

  it('tells Settings that temperature is unavailable when the model does not support it', () => {
    modelsMap = { 'model-id': { allowTemperature: false } };

    dom.render(<TestForm />);

    expect(getSettings().getAttribute('data-temperature')).toBe('false');
  });

  it('treats temperature as available while the selected model is not loaded', () => {
    modelsMap = {};

    dom.render(<TestForm />);

    expect(getSettings().getAttribute('data-temperature')).toBe('true');
  });

  it.each([true, false])('passes process-files availability (%s) to Settings', (isAvailable) => {
    dom.render(<TestForm isProcessLargeFilesAvailable={isAvailable} />);

    expect(getSettings().getAttribute('data-process-files')).toBe(String(isAvailable));
  });

  it('passes read-only through to the model picker, Settings and Attachments', () => {
    dom.render(<TestForm isReadonly />);

    expect(dom.container.querySelector('button')?.disabled).toBe(true);
    expect(getSettings().getAttribute('data-readonly')).toBe('true');
    expect(
      dom.container
        .querySelector('[data-testid="attachments-section"]')
        ?.getAttribute('data-readonly'),
    ).toBe('true');
  });
});
