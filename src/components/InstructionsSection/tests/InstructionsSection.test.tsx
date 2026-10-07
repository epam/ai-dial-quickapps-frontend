import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InstructionsSection from '../InstructionsSection';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/components/common/MarkdownEditor/MarkdownEditorContainer', () => ({
  DialMarkdownEditorContainer: ({
    value,
    onChangeValue,
    placeholder,
  }: {
    value: string;
    onChangeValue: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="Instructions editor"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChangeValue(event.target.value)}
    />
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
  const [value, setValue] = useState('Existing instructions');
  return <InstructionsSection value={value} onChange={setValue} />;
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
    expect(container.textContent).not.toContain('Orchestrator');
    expect(container.textContent).not.toContain('Model');
    expect(container.textContent).not.toContain('Temperature');
    expect(container.textContent).not.toContain('Process files');
    const instructionsSection = container.querySelector('section[aria-label="Instructions"]');
    expect(instructionsSection?.className).toContain('rounded-[24px]');
    expect(instructionsSection?.className).toContain('bg-layer-0');
    expect(instructionsSection?.className).toContain('shadow-sm');
    expect(container.querySelector('[aria-label="Instructions editor"]')).toBeTruthy();
    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });

  it('keeps the existing instructions value bound to the editor', () => {
    act(() => root.render(<TestForm />));

    const editor = container.querySelector('[aria-label="Instructions editor"]') as HTMLTextAreaElement;
    expect(editor.value).toBe('Existing instructions');

    act(() => {
      editor.value = 'Changed instructions';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(editor.value).toBe('Changed instructions');
  });
});
