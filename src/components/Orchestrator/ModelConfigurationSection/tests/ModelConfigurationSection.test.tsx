import { act } from 'react';
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
    isTemperatureAvailable,
    isProcessLargeFilesAvailable,
  }: {
    isTemperatureAvailable: boolean;
    isProcessLargeFilesAvailable: boolean;
  }) => (
    <div
      data-testid="settings-section"
      data-temperature={String(isTemperatureAvailable)}
      data-process-files={String(isProcessLargeFilesAvailable)}
    />
  ),
}));
vi.mock('@/components/EditJson/EditJsonLink/EditJsonLink', () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <button type="button" data-testid="edit-json" onClick={onClick}>
      Edit JSON
    </button>
  ),
}));
vi.mock('@/components/Attachments/AttachmentsSection/AttachmentsSection', () => ({
  default: ({ value }: { value: string[] }) => (
    <div data-testid="attachments-section" data-value={value.join(',')} />
  ),
}));

interface TestFormProps {
  isProcessLargeFilesAvailable?: boolean;
}

const onEditJsonClick = vi.fn();

const TestForm = ({ isProcessLargeFilesAvailable = true }: TestFormProps) => (
  <ModelConfigurationSection
    model="model-id"
    onModelChange={vi.fn()}
    errors={{}}
    isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
    isCodeInterpreterEnabled={false}
    isCodeInterpreterOn={false}
    onCodeInterpreterChange={vi.fn()}
    isAddAttachmentEnabled={false}
    isWebFetchEnabled={false}
    advancedSettings={{
      temperature: 0.5,
      maxInputAttachments: undefined,
      timestamp: true,
      fileTools: false,
      processLargeFiles: false,
      addAttachment: false,
      webFetch: false,
    }}
    onAdvancedSettingsSave={vi.fn()}
    isAttachmentsEnabled
    onAttachmentsEnabledChange={vi.fn()}
    inputAttachmentTypes={['application/pdf']}
    onInputAttachmentTypesChange={vi.fn()}
    onEditJsonClick={onEditJsonClick}
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

  it('ends with a divided footer holding the Edit JSON link, after all the rows', () => {
    onEditJsonClick.mockClear();
    dom.render(<TestForm />);

    const link = dom.container.querySelector<HTMLElement>('[data-testid="edit-json"]');
    const footer = link?.parentElement;
    expect(footer?.className).toContain('border-t');
    expect(footer?.className).toContain('mt-auto');
    expect(footer?.className).toContain('justify-end');
    expect(footer?.previousElementSibling?.contains(getSettings())).toBe(true);
    expect(footer?.nextElementSibling).toBeNull();

    act(() => link?.click());
    expect(onEditJsonClick).toHaveBeenCalledTimes(1);
  });

  it('uses logical alignment only, so the footer follows the document direction', () => {
    dom.render(<TestForm />);

    const footerClass =
      dom.container.querySelector('[data-testid="edit-json"]')?.parentElement?.className ?? '';
    expect(footerClass).not.toMatch(/(?:^|\s)(?:ml|mr|pl|pr|left|right|text-left|text-right)-/);
  });
});
