import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QuickApp2Form } from '@/form/quickApp2Form';

import ModelConfigurationSection from '../ModelConfigurationSection';

let modelsMap: Record<string, { allowTemperature?: boolean }> = {};

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ modelsMap }),
}));
vi.mock('@/utils/application', () => ({
  doesModelAllowTemperature: (model: { allowTemperature?: boolean }) => model.allowTemperature !== false,
}));
vi.mock('../../ModelField', () => ({
  ModelField: ({ disabled }: { disabled?: boolean }) => (
    <button type="button" disabled={disabled}>
      Model picker
    </button>
  ),
}));
vi.mock('@/components/common/Temperature', () => ({
  TemperatureSlider: ({ disabled }: { disabled?: boolean }) => (
    <button type="button" disabled={disabled}>
      Temperature control
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
vi.mock('@epam/ai-dial-ui-kit', () => ({
  DialFormItem: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <div>{label}</div>
      {children}
    </div>
  ),
}));

const TestForm = ({ isReadonly = false }: { isReadonly?: boolean }) => {
  const { control } = useForm<QuickApp2Form>({
    defaultValues: {
      model: 'model-id',
      temperature: 0.5,
      processLargeFiles: false,
    } as QuickApp2Form,
  });

  return (
    <ModelConfigurationSection
      control={control}
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
    expect(container.textContent).toContain('Model picker');
    expect(container.textContent).toContain('Temperature control');
    expect(container.textContent).toContain('Process files toggle');
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
