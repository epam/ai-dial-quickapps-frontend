import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ModelConfigurationSection from '../ModelConfigurationSection';

let modelsMap: Record<string, { allowTemperature?: boolean }> = {};

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ modelsMap }),
}));
vi.mock('@/utils/application', () => ({
  doesModelAllowTemperature: (model: { allowTemperature?: boolean }) =>
    model.allowTemperature !== false,
}));
vi.mock('@/components/Orchestrator/DefaultModelBlock/DefaultModelBlock', () => ({
  DefaultModelBlock: ({ disabled }: { disabled?: boolean }) => (
    <button type="button" disabled={disabled}>
      Model picker
    </button>
  ),
}));
vi.mock('@/components/Settings/SettingsSection', () => ({
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
vi.mock('@/components/Attachments/AttachmentsSection', () => ({
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
    advancedSettings={{
      temperature: 0.5,
      maxInputAttachments: undefined,
      timestamp: true,
      fileTools: false,
      processLargeFiles: false,
    }}
    onAdvancedSettingsSave={vi.fn()}
    attachmentsEnabled
    onAttachmentsEnabledChange={vi.fn()}
    inputAttachmentTypes={['application/pdf']}
    onInputAttachmentTypesChange={vi.fn()}
  />
);

let root: Root;
let container: HTMLDivElement;

const getSettings = () => container.querySelector('[data-testid="settings-section"]') as HTMLElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  modelsMap = { 'model-id': {} };
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ModelConfigurationSection', () => {
  it('renders the Default model, then Settings, then Attachments', () => {
    act(() => root.render(<TestForm />));

    expect(container.textContent).toContain('Configuration');
    expect(
      container.querySelector('section[aria-labelledby="model-configuration-heading"]')?.className,
    ).toContain('px-8');
    expect(getSettings().previousElementSibling?.textContent).toBe('Model picker');
    const attachments = container.querySelector('[data-testid="attachments-section"]');
    expect(attachments?.previousElementSibling).toBe(getSettings());
    expect(attachments?.getAttribute('data-value')).toBe('application/pdf');
  });

  it('has no inline temperature or process-files controls', () => {
    act(() => root.render(<TestForm />));

    expect(container.querySelector('[role="slider"]')).toBeNull();
    expect(container.querySelector('[role="switch"]')).toBeNull();
    expect(container.textContent).not.toContain('Temperature');
    expect(container.textContent).not.toContain('Process files');
    expect(container.querySelectorAll('h3')).toHaveLength(0);
  });

  it('tells Settings that temperature is available for a supporting model', () => {
    act(() => root.render(<TestForm />));

    expect(getSettings().getAttribute('data-temperature')).toBe('true');
  });

  it('tells Settings that temperature is unavailable when the model does not support it', () => {
    modelsMap = { 'model-id': { allowTemperature: false } };

    act(() => root.render(<TestForm />));

    expect(getSettings().getAttribute('data-temperature')).toBe('false');
  });

  it('treats temperature as available while the selected model is not loaded', () => {
    modelsMap = {};

    act(() => root.render(<TestForm />));

    expect(getSettings().getAttribute('data-temperature')).toBe('true');
  });

  it.each([true, false])('passes process-files availability (%s) to Settings', (isAvailable) => {
    act(() => root.render(<TestForm isProcessLargeFilesAvailable={isAvailable} />));

    expect(getSettings().getAttribute('data-process-files')).toBe(String(isAvailable));
  });

  it('passes read-only through to the model picker, Settings and Attachments', () => {
    act(() => root.render(<TestForm isReadonly />));

    expect(container.querySelector('button')?.disabled).toBe(true);
    expect(getSettings().getAttribute('data-readonly')).toBe('true');
    expect(
      container.querySelector('[data-testid="attachments-section"]')?.getAttribute('data-readonly'),
    ).toBe('true');
  });
});
