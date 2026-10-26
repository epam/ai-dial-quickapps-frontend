import { act, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ApplicationEditorI18nKeys, ButtonsI18nKeys } from '@/constants/translation-keys';
import { getQuickApp2FormData } from '@/form/quickApp2Form';
import { click, getButton, typeInto } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
import { buildEditJsonDocument, type EditJsonContext } from '@/utils/edit-json';

import EditJsonPopup from '../EditJsonPopup';

interface MockButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

const themeState = vi.hoisted(() => ({
  currentTheme: { id: 'light' } as { id: string } | undefined,
}));

vi.mock('@/context/ThemeContext', () => ({
  useThemeContext: () => ({ currentTheme: themeState.currentTheme }),
}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  ButtonAppearance: { Link: 'link' },
  ButtonVariant: { Primary: 'primary', Neutral: 'neutral' },
  PopupSize: { Lg: 'lg' },
  EditorThemes: { dark: 'dark', light: 'light' },
  mergeClasses: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
  DialLoader: () => <span>loading</span>,
  Popup: ({
    header,
    children,
    onClose,
    additionalButtons,
    mainButtons,
  }: {
    header: string;
    children: ReactNode;
    onClose: () => void;
    additionalButtons: MockButtonProps[];
    mainButtons: MockButtonProps[];
  }) => (
    <div role="dialog" aria-label={header}>
      <button type="button" aria-label="close" onClick={onClose} />
      {children}
      {[...additionalButtons, ...mainButtons].map((button) => (
        <button
          key={button.label}
          type="button"
          disabled={button.disabled}
          onClick={button.onClick}
        >
          {button.label}
        </button>
      ))}
    </div>
  ),
  LazyDialJsonEditor: async () => ({
    DialJsonEditor: ({
      value,
      currentTheme,
      onChange,
      options,
    }: {
      value: string;
      currentTheme: string;
      onChange: (value: string) => void;
      options: { ariaLabel: string };
    }) => (
      <textarea
        aria-label={options.ariaLabel}
        data-theme={currentTheme}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    ),
  }),
}));

const context: EditJsonContext = {
  allEntitiesMap: {
    'model-1': { id: 'model-1', features: { tools: true } },
  } as unknown as EditJsonContext['allEntitiesMap'],
  language: 'en',
  toolSupportingModelIds: ['model-1'],
  availableModelIds: ['model-1'],
  defaultModelId: 'model-1',
};

const values = getQuickApp2FormData(
  {
    applicationProperties: {
      orchestrator: {
        deployment: { deployment_id: 'model-1' },
        system_prompt: { type: 'custom', variables: {}, content: 'Be brief' },
      },
    },
  },
  ['model-1'],
  ['model-1'],
  'model-1',
);
const document = buildEditJsonDocument(values, context);

const dom = setupTestRoot();

const renderPopup = async () => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  await act(async () =>
    dom.root.render(
      <EditJsonPopup document={document} context={context} onSave={onSave} onClose={onClose} />,
    ),
  );
  return { onSave, onClose };
};

const getEditor = () =>
  dom.container.querySelector<HTMLTextAreaElement>(
    `textarea[aria-label="${ApplicationEditorI18nKeys.EditJsonEditorLabel}"]`,
  );

const getSave = () => getButton(ButtonsI18nKeys.Save, dom.container) as HTMLButtonElement;

describe('EditJsonPopup', () => {
  it('shows the document in a labelled editor with Save enabled', async () => {
    await renderPopup();

    expect(getEditor()?.value).toBe(document);
    expect(getSave().disabled).toBe(false);
    expect(dom.container.querySelector('[role="alert"]')).toBeNull();
    expect(getEditor()?.closest('[dir="ltr"]')).toBeTruthy();
  });

  it('uses the dark editor theme for a loaded non-light theme', async () => {
    themeState.currentTheme = { id: 'dark' };
    await renderPopup();

    expect(getEditor()?.dataset.theme).toBe('dark');
    themeState.currentTheme = { id: 'light' };
  });

  it('disables Save and shows the error for invalid text, then recovers', async () => {
    await renderPopup();

    typeInto(getEditor(), '{ "orchestrator": ');
    expect(getSave().disabled).toBe(true);
    expect(dom.container.querySelector('[role="alert"]')?.textContent).toContain(
      ApplicationEditorI18nKeys.EditJsonSyntaxError,
    );

    typeInto(getEditor(), document);
    expect(getSave().disabled).toBe(false);
    expect(dom.container.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows the form message of a document that fails the form rules', async () => {
    await renderPopup();

    typeInto(getEditor(), document.replace('Be brief', ' '));

    expect(getSave().disabled).toBe(true);
    expect(dom.container.querySelector('[role="alert"]')?.textContent).toContain(
      ApplicationEditorI18nKeys.InstructionsRequired,
    );
  });

  it('saves the parsed values and closes', async () => {
    const { onSave, onClose } = await renderPopup();

    typeInto(getEditor(), document.replace('Be brief', 'Be kind'));
    click(getSave());

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ instructions: 'Be kind' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('discards the draft on Cancel and on close', async () => {
    const { onSave, onClose } = await renderPopup();

    typeInto(getEditor(), document.replace('Be brief', 'Be kind'));
    click(getButton(ButtonsI18nKeys.Cancel, dom.container));
    click(getButton('close', dom.container));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
