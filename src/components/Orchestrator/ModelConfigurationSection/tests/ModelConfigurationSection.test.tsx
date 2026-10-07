import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ModelConfigurationSection from '../ModelConfigurationSection';

let modelsMap: Record<string, { allowTemperature?: boolean }> = {};

vi.mock('@/hooks/use-translation', () => ({
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
  DefaultModelBlock: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={() => onChange(value)}>
      Model picker
    </button>
  ),
}));
vi.mock('@epam/ai-dial-ui-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@epam/ai-dial-ui-kit')>()),
  Slider: ({
    value,
    onChange,
    disabled,
    labels,
    'aria-label': ariaLabel,
  }: {
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
    labels: string[];
    'aria-label': string;
  }) => (
    <button type="button" aria-label={ariaLabel} disabled={disabled} onClick={() => onChange(0.8)}>
      Temperature control {value} {labels.join(' / ')}
    </button>
  ),
  Switch: ({
    disabled,
    labelProps,
  }: {
    disabled?: boolean;
    labelProps: { label: string; caption?: string };
  }) => (
    <button type="button" disabled={disabled} data-caption={labelProps.caption}>
      Process files toggle
    </button>
  ),
}));
vi.mock('@/components/Settings/SettingsSection', () => ({
  default: ({ isReadonly }: { isReadonly: boolean }) => (
    <div data-testid="settings-section" data-readonly={String(isReadonly)} />
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
  tooltip?: string;
  isProcessLargeFilesAvailable?: boolean;
}

const TestForm = ({
  isReadonly = false,
  tooltip,
  isProcessLargeFilesAvailable = true,
}: TestFormProps) => {
  const [model, setModel] = useState('model-id');
  const [temperature, setTemperature] = useState(0.5);
  const [processLargeFiles, setProcessLargeFiles] = useState(false);

  return (
    <ModelConfigurationSection
      model={model}
      onModelChange={setModel}
      temperature={temperature}
      onTemperatureChange={setTemperature}
      processLargeFiles={processLargeFiles}
      onProcessLargeFilesChange={setProcessLargeFiles}
      errors={{}}
      isReadonly={isReadonly}
      tooltip={tooltip}
      isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
      advancedSettings={{ maxInputAttachments: undefined, timestamp: true, fileTools: false }}
      onAdvancedSettingsSave={vi.fn()}
      attachmentsEnabled
      onAttachmentsEnabledChange={vi.fn()}
      inputAttachmentTypes={['application/pdf']}
      onInputAttachmentTypesChange={vi.fn()}
    />
  );
};

let root: Root;
let container: HTMLDivElement;

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
  it('renders the existing model, temperature, and process-files controls', () => {
    act(() => root.render(<TestForm />));

    expect(container.textContent).toContain('Configuration');
    expect(
      container.querySelector('section[aria-labelledby="model-configuration-heading"]')?.className,
    ).toContain('px-8');
    expect(container.textContent).toContain('Model picker');
    expect(container.textContent).toContain('Temperature control');
    expect(container.textContent).toContain('Process files toggle');
  });

  it('composes the Settings row after the existing controls and passes read-only through', () => {
    act(() => root.render(<TestForm isReadonly />));

    const settings = container.querySelector('[data-testid="settings-section"]');
    expect(settings?.getAttribute('data-readonly')).toBe('true');
    expect(settings?.previousElementSibling?.textContent).toContain('Process files toggle');
  });

  it('renders the Attachments row directly after the Settings row with the form value', () => {
    act(() => root.render(<TestForm isReadonly />));

    const attachments = container.querySelector('[data-testid="attachments-section"]');
    expect(attachments?.previousElementSibling?.getAttribute('data-testid')).toBe('settings-section');
    expect(attachments?.getAttribute('data-value')).toBe('application/pdf');
    expect(attachments?.getAttribute('data-readonly')).toBe('true');
  });

  it('renders the model picker without a separate "Model" form label', () => {
    act(() => root.render(<TestForm />));

    const labels = [...container.querySelectorAll('div')].map((el) => el.textContent);
    expect(labels).not.toContain('Model');
    expect(container.textContent).toContain('Model picker');
  });

  it('shows temperature and process files as caption sections with their descriptions', () => {
    act(() => root.render(<TestForm />));

    const headings = [...container.querySelectorAll('h3')].map((heading) => heading.textContent);
    expect(headings).toEqual(['Temperature', 'Process files']);
    expect(container.textContent).toContain(
      'Higher values will make the output more random, while lower values will make it more focused and deterministic.',
    );
    expect(container.textContent).toContain('Allows the orchestrator to handle attachments');
  });

  it('names the temperature slider and labels its scale through i18n', () => {
    act(() => root.render(<TestForm />));

    const slider = container.querySelector('button[aria-label="Temperature"]');
    expect(slider?.textContent).toBe('Temperature control 0.5 Precise / Neutral / Creative');
  });

  it('reports a temperature change', () => {
    act(() => root.render(<TestForm />));

    act(() =>
      container.querySelector<HTMLButtonElement>('button[aria-label="Temperature"]')?.click(),
    );

    expect(container.textContent).toContain('Temperature control 0.8');
  });

  it('shows the read-only hint in the switch info button', () => {
    act(() => root.render(<TestForm isReadonly tooltip="Shared apps are read-only" />));

    expect(
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Process files toggle')
        ?.getAttribute('data-caption'),
    ).toBe('Shared apps are read-only');
  });

  it('omits temperature when the selected model does not support it', () => {
    modelsMap = { 'model-id': { allowTemperature: false } };

    act(() => root.render(<TestForm />));

    expect(container.textContent).not.toContain('Temperature control');
    expect(container.textContent).toContain('Model picker');
  });

  it('omits process files when the selected model does not accept attachments', () => {
    act(() => root.render(<TestForm isProcessLargeFilesAvailable={false} />));

    expect(container.textContent).not.toContain('Process files');
    expect(container.textContent).toContain('Temperature control');
  });

  it('shows temperature while the selected model is not loaded', () => {
    modelsMap = {};

    act(() => root.render(<TestForm />));

    expect(container.querySelector('button[aria-label="Temperature"]')).not.toBeNull();
  });

  it('disables the temperature slider without a hint in read-only mode', () => {
    act(() => root.render(<TestForm isReadonly tooltip="Shared apps are read-only" />));

    const slider = container.querySelector<HTMLButtonElement>('button[aria-label="Temperature"]');
    expect(slider?.disabled).toBe(true);
    expect(slider?.closest('[title]')).toBeNull();
    expect(slider?.closest('section')?.textContent).not.toContain('Shared apps are read-only');
  });

  it('preserves read-only behavior for moved controls', () => {
    act(() => root.render(<TestForm isReadonly />));

    const controls = [...container.querySelectorAll('button')];
    expect(controls).toHaveLength(3);
    expect(controls.every((control) => control.disabled)).toBe(true);
  });
});
