import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';

import InstructionsSection from '../InstructionsSection';
import { ApplicationEditorI18nKeys, ChatSettingsI18nKeys } from '@/constants/translation-keys';

const themeState = vi.hoisted(() => ({
  currentTheme: { id: 'light' } as { id: string } | undefined,
}));

vi.mock('@/context/ThemeContext', () => ({
  useThemeContext: () => ({ currentTheme: themeState.currentTheme }),
}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  EditorThemes: { dark: 'dark', light: 'light' },
  ErrorText: ({ text }: { text?: string }) => (text ? <span role="alert">{text}</span> : null),
  LazyMarkdownEditor: async () => ({
    MarkdownEditor: ({
      value,
      onChange,
      placeholder,
      showDragbar,
      theme,
    }: {
      value: string;
      onChange: (value: string) => void;
      placeholder?: string;
      showDragbar?: boolean;
      theme?: string;
    }) => (
      <textarea
        aria-label="Instructions editor"
        data-show-dragbar={String(showDragbar)}
        data-theme={theme}
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

const dom = setupTestRoot();

const getEditorTheme = () =>
  dom.container.querySelector('[aria-label="Instructions editor"]')?.getAttribute('data-theme');

describe('InstructionsSection', () => {
  afterEach(() => {
    themeState.currentTheme = { id: 'light' };
  });

  it('renders the instructions editor in a standalone section', async () => {
    await act(async () => dom.root.render(<TestForm />));

    expect(dom.container.textContent).toContain(ApplicationEditorI18nKeys.InstructionsLabel);
    const instructionsSelector = `section[aria-label="${ApplicationEditorI18nKeys.InstructionsLabel}"]`;
    const heading = dom.container.querySelector(`${instructionsSelector} > h2`);
    expect(heading?.className).toContain('text-primary');
    expect(heading?.querySelector('.dial-h3-text')?.textContent).toBe(
      ApplicationEditorI18nKeys.InstructionsLabel,
    );
    expect(heading?.textContent).toContain('*');
    expect(dom.container.textContent).not.toContain(
      ApplicationEditorI18nKeys.OrchestratorDefaultModel,
    );
    expect(dom.container.textContent).not.toContain(ApplicationEditorI18nKeys.OrchestratorModel);
    expect(dom.container.textContent).not.toContain(ChatSettingsI18nKeys.TemperatureLabel);
    expect(dom.container.textContent).not.toContain(
      ApplicationEditorI18nKeys.AdvancedSettingsProcessFiles,
    );
    const instructionsSection = dom.container.querySelector(instructionsSelector);
    expect(instructionsSection?.className).toContain('rounded-[20px]');
    expect(instructionsSection?.className).toContain('bg-layer-raised');
    expect(instructionsSection?.className).toContain('shadow-md');
    expect(dom.container.querySelector('[aria-label="Instructions editor"]')).toBeTruthy();
    expect(dom.container.querySelector('[aria-expanded]')).toBeNull();
  });

  it('keeps the existing instructions value bound to the editor', async () => {
    await act(async () => dom.root.render(<TestForm />));

    const editor = dom.container.querySelector(
      '[aria-label="Instructions editor"]',
    ) as HTMLTextAreaElement;
    expect(editor.value).toBe('Existing instructions');

    act(() => {
      editor.value = 'Changed instructions';
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(editor.value).toBe('Changed instructions');
  });

  it('hides the editor resize drag bar', async () => {
    await act(async () => dom.root.render(<TestForm />));

    const editor = dom.container.querySelector('[aria-label="Instructions editor"]');
    expect(editor?.getAttribute('data-show-dragbar')).toBe('false');
  });

  it('shows the translated error as an alert only when there is one', async () => {
    await act(async () => dom.root.render(<InstructionsSection value="" onChange={vi.fn()} />));
    expect(dom.container.querySelector('[role="alert"]')).toBeNull();

    await act(async () =>
      dom.root.render(
        <InstructionsSection value="" error="Instructions are required" onChange={vi.fn()} />,
      ),
    );
    expect(dom.container.querySelector('[role="alert"]')?.textContent).toBe(
      'Instructions are required',
    );
  });

  it('uses the light editor theme when no theme configuration loaded', async () => {
    themeState.currentTheme = undefined;
    await act(async () => dom.root.render(<TestForm />));

    expect(getEditorTheme()).toBe('light');
  });

  it('uses the dark editor theme for a loaded dark theme', async () => {
    themeState.currentTheme = { id: 'dark' };
    await act(async () => dom.root.render(<TestForm />));

    expect(getEditorTheme()).toBe('dark');
  });

  it('uses the light editor theme for the loaded light theme', async () => {
    await act(async () => dom.root.render(<TestForm />));

    expect(getEditorTheme()).toBe('light');
  });
});
