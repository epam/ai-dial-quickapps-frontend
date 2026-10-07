import React, { act, useState } from 'react';
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
vi.mock('../../ModelField', () => ({
  ModelField: ({
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
vi.mock('@/components/common/Temperature', () => ({
  TemperatureSlider: ({
    temperature,
    onChangeTemperature,
    disabled,
  }: {
    temperature: number;
    onChangeTemperature: (value: number) => void;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled} onClick={() => onChangeTemperature(0.8)}>
      Temperature control {temperature}
    </button>
  ),
}));
vi.mock('@/components/common/ToggleSwitch/ToggleSwitch', () => ({
  ToggleSwitch: ({ disabled }: { disabled?: boolean }) => (
    <button type="button" disabled={disabled}>
      Process files toggle
    </button>
  ),
}));
vi.mock('@/components/Settings/SettingsSection', () => ({
  default: ({ isReadonly }: { isReadonly: boolean }) => (
    <div data-testid="settings-section" data-readonly={String(isReadonly)} />
  ),
}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  DialFormItem: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <div>{label}</div>
      {children}
    </div>
  ),
}));

const TestForm = ({ isReadonly = false }: { isReadonly?: boolean }) => {
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
      isProcessLargeFilesAvailable
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

  it('renders the model picker without a separate "Model" form label', () => {
    act(() => root.render(<TestForm />));

    const labels = [...container.querySelectorAll('div')].map((el) => el.textContent);
    expect(labels).not.toContain('Model');
    expect(container.textContent).toContain('Model picker');
  });

  it('omits temperature when the selected model does not support it', () => {
    modelsMap = { 'model-id': { allowTemperature: false } };

    act(() => root.render(<TestForm />));

    expect(container.textContent).not.toContain('Temperature control');
    expect(container.textContent).toContain('Model picker');
  });

  it('preserves read-only behavior for moved controls', () => {
    act(() => root.render(<TestForm isReadonly />));

    const controls = [...container.querySelectorAll('button')];
    expect(controls).toHaveLength(3);
    expect(controls.every((control) => control.disabled)).toBe(true);
  });
});
