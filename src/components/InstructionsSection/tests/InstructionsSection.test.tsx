import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QuickApp2Form } from '@/form/quickApp2Form';

import InstructionsSection from '../InstructionsSection';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/components/common/MarkdownEditor/MarkdownEditorContainer', () => ({
  DialMarkdownEditorContainer: ({ placeholder }: { placeholder?: string }) => (
    <textarea aria-label="Instructions editor" placeholder={placeholder} />
  ),
}));

const TestForm = () => {
  const { control } = useForm<QuickApp2Form>({
    defaultValues: { instructions: 'Existing instructions' } as QuickApp2Form,
  });
  return <InstructionsSection control={control} />;
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

describe('InstructionsSection', () => {
  it('renders the instructions editor immediately in a standalone section', () => {
    act(() => root.render(<TestForm />));

    expect(container.textContent).toContain('Instructions');
    const heading = container.querySelector('section[aria-label="Instructions"] > h2');
    expect(heading?.className).toContain('text-primary');
    expect(heading?.querySelector('.dial-h3-text')?.textContent).toBe('Instructions');
    expect(heading?.textContent).toContain('*');
    expect(container.textContent).not.toContain('Orchestrator');
    expect(container.textContent).not.toContain('Model');
    expect(container.textContent).not.toContain('Temperature');
    expect(container.textContent).not.toContain('Process files');
    const instructionsSection = container.querySelector('section[aria-label="Instructions"]');
    expect(instructionsSection?.className).toContain('rounded-[20px]');
    expect(instructionsSection?.className).toContain('bg-layer-raised');
    expect(instructionsSection?.className).toContain('shadow-md');
    expect(container.querySelector('[aria-label="Instructions editor"]')).toBeTruthy();
    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });

  it('keeps the existing instructions value bound to the editor', () => {
    act(() => root.render(<TestForm />));

    expect(container.querySelector('[aria-label="Instructions editor"]')).toBeTruthy();
  });
});
