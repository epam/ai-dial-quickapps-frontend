import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import InstructionsSection from '../InstructionsSection';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/context/ThemeContext', () => ({
  useThemeContext: () => ({ currentTheme: { id: 'light' } }),
}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  EditorThemes: { dark: 'dark', light: 'light' },
  LazyMarkdownEditor: async () => ({
    MarkdownEditor: ({
      value,
      onChange,
      placeholder,
    }: {
      value: string;
      onChange: (value: string) => void;
      placeholder?: string;
    }) => (
      <textarea
        aria-label="Instructions editor"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    ),
  }),
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
  it('renders the instructions editor in a standalone section', async () => {
    await act(async () => root.render(<TestForm />));

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

  it('keeps the existing instructions value bound to the editor', async () => {
    await act(async () => root.render(<TestForm />));

    const editor = container.querySelector('[aria-label="Instructions editor"]') as HTMLTextAreaElement;
    expect(editor.value).toBe('Existing instructions');

    act(() => {
      editor.value = 'Changed instructions';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(editor.value).toBe('Changed instructions');
  });
});
