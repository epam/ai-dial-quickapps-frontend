import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QuickApp2Form } from '@/form/quickApp2Form';

import OrchestratorSection from '../OrchestratorSection';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/components/common/MarkdownEditor/MarkdownEditorContainer', () => ({
  DialMarkdownEditorContainer: ({ placeholder }: { placeholder?: string }) => (
    <textarea aria-label="Instructions editor" placeholder={placeholder} />
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

const TestForm = () => {
  const { control } = useForm<QuickApp2Form>({
    defaultValues: { instructions: 'Existing instructions' } as QuickApp2Form,
  });
  return <OrchestratorSection control={control} />;
};

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('OrchestratorSection', () => {
  it('renders the instructions editor immediately in a standalone section', () => {
    act(() => root.render(<TestForm />));

    expect(container.textContent).toContain('Instructions');
    expect(container.textContent).not.toContain('Orchestrator');
    expect(container.textContent).not.toContain('Model');
    expect(container.textContent).not.toContain('Temperature');
    expect(container.textContent).not.toContain('Process files');
    expect(container.querySelector('[aria-label="Instructions editor"]')).toBeTruthy();
    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });

  it('keeps the existing instructions value bound to the editor', () => {
    act(() => root.render(<TestForm />));

    expect(container.querySelector('[aria-label="Instructions editor"]')).toBeTruthy();
  });
});
