import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import type { ConversationStartersValues } from '@/types/conversation-starters';

import ConversationStartersModal from '../ConversationStartersModal';

interface MockButtonProps {
  label: string;
  onClick: () => void;
}

interface MockPopupProps {
  open: boolean;
  header: string;
  closeAriaLabel: string;
  children?: React.ReactNode;
  onClose: () => void;
  additionalButtons: MockButtonProps[];
  mainButtons: MockButtonProps[];
}

interface MockInputProps {
  'aria-label'?: string;
  labelProps?: { label: string; className?: string };
  placeholder?: string;
  tooltipText?: string;
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  iconAfter?: React.ReactNode;
  onChange: (value?: string) => void;
}

interface MockSwitchProps {
  isOn: boolean;
  disabled?: boolean;
  labelProps: { label: string; caption?: string };
  caption?: string;
  onChange: (value: boolean) => void;
}

interface MockRadioGroupProps {
  labelProps: { label: string; className?: string; caption?: string };
  items: { value: string; label: string }[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  ButtonAppearance: { Link: 'link', Ghost: 'ghost' },
  ButtonVariant: { Primary: 'primary', Neutral: 'neutral', Danger: 'danger', Secondary: 'secondary' },
  PopupSize: { Md: 'md' },
  DIAL_ICON_SIZE: { SM: 16, MD: 20, LG: 24 },
  DIAL_KIT_ICON_STROKE: 1.5,
  mergeClasses: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
  Popup: ({ open, header, closeAriaLabel, children, onClose, additionalButtons, mainButtons }: MockPopupProps) =>
    open ? (
      <div role="dialog" aria-label={header}>
        <button type="button" aria-label={closeAriaLabel} onClick={onClose} />
        <div data-testid="body">{children}</div>
        {[...additionalButtons, ...mainButtons].map((button) => (
          <button key={button.label} type="button" onClick={button.onClick}>
            {button.label}
          </button>
        ))}
      </div>
    ) : null,
  Input: ({ labelProps, iconAfter, invalid, tooltipText, onChange, ...props }: MockInputProps) => (
    <div>
      <input
        {...props}
        title={tooltipText}
        aria-label={props['aria-label'] ?? labelProps?.label}
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value || undefined)}
      />
      {iconAfter}
    </div>
  ),
  IconButton: ({ icon, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode }) => (
    <button {...props}>{icon}</button>
  ),
  Switch: ({ isOn, disabled, labelProps, caption, onChange }: MockSwitchProps) => (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={labelProps.label}
        data-hint={labelProps.caption}
        disabled={disabled}
        onClick={() => onChange(!isOn)}
      />
      <span>{caption}</span>
    </div>
  ),
  RadioGroup: ({ labelProps, items, value, disabled, onChange }: MockRadioGroupProps) => (
    <div role="radiogroup" aria-label={labelProps.label} data-hint={labelProps.caption}>
      {items.map((item) => (
        <input
          key={item.value}
          type="radio"
          aria-label={item.label}
          checked={item.value === value}
          disabled={disabled}
          onChange={() => onChange(item.value)}
        />
      ))}
    </div>
  ),
}));

const blankStarter = { id: 'blank', title: '', text: '' };

const emptyValues: ConversationStartersValues = {
  starters: [blankStarter],
  autoSubmit: true,
  chatMessageInputDisabled: false,
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

const renderModal = (values: ConversationStartersValues = emptyValues) => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  act(() => root.render(<ConversationStartersModal values={values} onSave={onSave} onClose={onClose} />));
  return { onSave, onClose };
};

const getButton = (name: string) =>
  [...container.querySelectorAll('button')].find(
    (button) => (button.getAttribute('aria-label') ?? button.textContent) === name,
  ) as HTMLButtonElement;

const getInputs = (name: string) =>
  [...container.querySelectorAll<HTMLInputElement>(`input[aria-label="${name}"]`)];

const getTitleInputs = () => getInputs(QuickAppEditorI18nKeys.ButtonLabel);
const getPromptInputs = () => getInputs(QuickAppEditorI18nKeys.PromptToSendInChat);
const getDeleteButtons = () =>
  [...container.querySelectorAll<HTMLButtonElement>(`button[aria-label="${QuickAppEditorI18nKeys.DeleteStarter}"]`)];
const getSwitch = () =>
  container.querySelector(
    `[role="switch"][aria-label="${QuickAppEditorI18nKeys.RequireStarterToStartNewChat}"]`,
  ) as HTMLButtonElement;
const getIntroInput = () => getInputs(QuickAppEditorI18nKeys.IntroMessage)[0];
const getRadio = (name: string) => getInputs(name)[0];

const typeInto = (input: HTMLInputElement, value: string) => {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const click = (element: HTMLElement) => act(() => element.click());

describe('ConversationStartersModal', () => {
  it('renders a named dialog seeded from the current values', () => {
    renderModal({
      starters: [{ id: 'a', title: 'Visual hierarchy', text: 'Analyze' }, blankStarter],
      introText: 'Hi!',
      autoSubmit: false,
      chatMessageInputDisabled: true,
    });

    expect(container.querySelector(`[role="dialog"][aria-label="${QuickAppEditorI18nKeys.SetUpConversationStarters}"]`)).toBeTruthy();
    expect(getTitleInputs().map((input) => input.value)).toEqual(['Visual hierarchy', '']);
    expect(getPromptInputs().map((input) => input.value)).toEqual(['Analyze', '']);
    expect(getIntroInput().value).toBe('Hi!');
    expect(getSwitch().getAttribute('aria-checked')).toBe('true');
    expect(getRadio(QuickAppEditorI18nKeys.PopulatePromptInTheChatInput).checked).toBe(true);
    expect(container.querySelector(`[role="radiogroup"][aria-label="${QuickAppEditorI18nKeys.WhenStarterIsSelected}"]`)).toBeTruthy();
  });

  it('appends a blank row when typing into the last row', () => {
    renderModal();

    typeInto(getTitleInputs()[0], 'Travel tips');

    expect(getTitleInputs().map((input) => input.value)).toEqual(['Travel tips', '']);
  });

  it('shows a counter for a non-empty label and stops it at 30 characters', () => {
    renderModal();

    expect(container.textContent).not.toContain('/30');

    typeInto(getTitleInputs()[0], 'Visual hierarchy');
    expect(container.textContent).toContain('16/30');

    typeInto(getTitleInputs()[0], 'x'.repeat(31));
    expect(getTitleInputs()[0].value).toBe('Visual hierarchy');
  });

  it('flags a legacy over-limit label without truncating it', () => {
    const legacy = 'x'.repeat(42);
    const { onSave } = renderModal({ ...emptyValues, starters: [{ id: 'a', title: legacy, text: 'p' }, blankStarter] });

    const counter = [...container.querySelectorAll('span')].find((span) => span.textContent === '42/30');
    expect(counter?.className).toContain('text-error');
    expect(getTitleInputs()[0].getAttribute('aria-invalid')).toBe('true');

    click(getButton(QuickAppEditorI18nKeys.Save));
    expect(onSave.mock.calls[0][0].starters[0].title).toBe(legacy);
  });

  it('deletes a starter and keeps the trailing row delete disabled', () => {
    renderModal({ ...emptyValues, starters: [{ id: 'a', title: 'A', text: 'a' }, blankStarter] });

    expect(getDeleteButtons()[1].disabled).toBe(true);

    click(getDeleteButtons()[0]);

    expect(getTitleInputs().map((input) => input.value)).toEqual(['']);
    expect(getDeleteButtons()[0].disabled).toBe(true);
  });

  it('explains on each disabled setting that a complete starter is required', () => {
    renderModal();
    const hint = QuickAppEditorI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings;
    const radioGroup = container.querySelector('[role="radiogroup"]');

    expect(getIntroInput().title).toBe(hint);
    expect(getSwitch().getAttribute('data-hint')).toBe(hint);
    expect(radioGroup?.getAttribute('data-hint')).toBe(hint);

    typeInto(getTitleInputs()[0], 'Travel tips');
    typeInto(getPromptInputs()[0], 'Suggest destinations');

    expect(getIntroInput().title).toBe('');
    expect(getSwitch().hasAttribute('data-hint')).toBe(false);
    expect(radioGroup?.hasAttribute('data-hint')).toBe(false);
  });

  it('enables the settings only while the draft has a complete starter', () => {
    renderModal();

    expect(container.textContent).toContain(QuickAppEditorI18nKeys.AtLeastOneStarterIsRequiredToEnableSettings);
    expect(getIntroInput().disabled).toBe(true);
    expect(getSwitch().disabled).toBe(true);
    expect(getRadio(QuickAppEditorI18nKeys.SendPromptToTheChat).disabled).toBe(true);

    typeInto(getTitleInputs()[0], 'Travel tips');
    expect(getIntroInput().disabled).toBe(true);

    typeInto(getPromptInputs()[0], 'Can you suggest some travel destinations?');
    expect(getIntroInput().disabled).toBe(false);
    expect(getSwitch().disabled).toBe(false);
    expect(getRadio(QuickAppEditorI18nKeys.SendPromptToTheChat).disabled).toBe(false);

    click(getSwitch());
    click(getDeleteButtons()[0]);

    expect(getSwitch().disabled).toBe(true);
    expect(getSwitch().getAttribute('aria-checked')).toBe('true');
  });

  it('discards the draft on Close and the header close control', () => {
    const { onSave, onClose } = renderModal();

    typeInto(getTitleInputs()[0], 'Unsaved');
    click(getButton(QuickAppEditorI18nKeys.Close));
    click(getButton(QuickAppEditorI18nKeys.CloseConversationStarters));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the draft and closes', () => {
    const { onSave, onClose } = renderModal();

    typeInto(getTitleInputs()[0], 'Travel tips');
    typeInto(getPromptInputs()[0], 'Suggest destinations');
    typeInto(getIntroInput(), 'Hi!');
    click(getSwitch());
    click(getRadio(QuickAppEditorI18nKeys.PopulatePromptInTheChatInput));
    click(getButton(QuickAppEditorI18nKeys.Save));

    expect(onSave).toHaveBeenCalledWith({
      starters: [
        { id: 'blank', title: 'Travel tips', text: 'Suggest destinations' },
        expect.objectContaining({ title: '', text: '' }),
      ],
      introText: 'Hi!',
      autoSubmit: false,
      chatMessageInputDisabled: true,
    });
    expect(onClose).toHaveBeenCalled();
  });

  describe('reordering', () => {
    const ROW_HEIGHT = 50;
    const ROW_GAP = 10;
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

    const threeStarters: ConversationStartersValues = {
      ...emptyValues,
      starters: [
        { id: 'a', title: 'A', text: 'a' },
        { id: 'b', title: 'B', text: 'b' },
        { id: 'c', title: 'C', text: 'c' },
        blankStarter,
      ],
    };

    // jsdom has no layout: give each sortable row (the handle's parent) a stacked rect so dnd-kit's
    // keyboard coordinates can find the neighbouring row.
    beforeEach(() => {
      Element.prototype.getBoundingClientRect = function getBoundingClientRect(this: Element) {
        const isRow = !!this.querySelector(':scope > button[aria-roledescription="sortable"]');
        const index = isRow ? [...(this.parentElement?.children ?? [])].indexOf(this) : -1;
        const top = Math.max(index, 0) * (ROW_HEIGHT + ROW_GAP);
        const height = isRow ? ROW_HEIGHT : 0;
        const width = isRow ? 500 : 0;
        return { top, left: 0, right: width, bottom: top + height, width, height, x: 0, y: top, toJSON: () => ({}) };
      };
    });

    afterEach(() => {
      Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    });

    const getHandles = () =>
      [...container.querySelectorAll<HTMLButtonElement>('button[aria-roledescription="sortable"]')];

    const pressKey = async (target: EventTarget, code: string) => {
      await act(async () => {
        target.dispatchEvent(new KeyboardEvent('keydown', { code, key: code === 'Space' ? ' ' : code, bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };

    const titles = () => getTitleInputs().map((input) => input.value);

    it('gives every row a named handle and disables the trailing one', () => {
      renderModal(threeStarters);

      const handles = getHandles();
      expect(handles).toHaveLength(4);
      expect(handles.every((handle) => handle.getAttribute('aria-label') === QuickAppEditorI18nKeys.ReorderStarter)).toBe(true);
      expect(handles[3].disabled || handles[3].getAttribute('aria-disabled') === 'true').toBe(true);
      expect(handles[0].disabled).toBe(false);
    });

    it('moves a starter up with the keyboard and saves the new order', async () => {
      const { onSave } = renderModal(threeStarters);
      const handle = getHandles()[1];

      act(() => handle.focus());
      await pressKey(handle, 'Space');
      await pressKey(handle, 'ArrowUp');
      await pressKey(handle, 'Space');

      expect(titles()).toEqual(['B', 'A', 'C', '']);

      click(getButton(QuickAppEditorI18nKeys.Save));
      expect(onSave.mock.calls[0][0].starters.map(({ id }: { id: string }) => id)).toEqual(['b', 'a', 'c', 'blank']);
    });

    it('cancels a keyboard move with Escape without closing the modal', async () => {
      const { onClose } = renderModal(threeStarters);
      const handle = getHandles()[1];

      act(() => handle.focus());
      await pressKey(handle, 'Space');
      await pressKey(handle, 'ArrowUp');
      // The popup's own dismissal (Escape / outside click / ×) is ignored while a drag is active.
      click(getButton(QuickAppEditorI18nKeys.CloseConversationStarters));
      await pressKey(handle, 'Escape');

      expect(titles()).toEqual(['A', 'B', 'C', '']);
      expect(onClose).not.toHaveBeenCalled();

      click(getButton(QuickAppEditorI18nKeys.CloseConversationStarters));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('never moves a starter below the trailing blank row', async () => {
      renderModal(threeStarters);
      const handle = getHandles()[2];

      act(() => handle.focus());
      await pressKey(handle, 'Space');
      await pressKey(handle, 'ArrowDown');
      await pressKey(handle, 'Space');

      expect(titles()).toEqual(['A', 'B', 'C', '']);
    });
  });

  it('keeps a direction-agnostic row order and unmirrored icons in RTL', () => {
    document.documentElement.dir = 'rtl';
    try {
      renderModal({ ...emptyValues, starters: [{ id: 'a', title: 'A', text: 'a' }, blankStarter] });

      const handle = container.querySelector('button[aria-roledescription="sortable"]') as HTMLElement;
      const row = handle.parentElement as HTMLElement;
      const controls = [...row.querySelectorAll('button, input')].map(
        (element) => element.getAttribute('aria-label'),
      );

      expect(controls).toEqual([
        QuickAppEditorI18nKeys.ReorderStarter,
        QuickAppEditorI18nKeys.ButtonLabel,
        QuickAppEditorI18nKeys.PromptToSendInChat,
        QuickAppEditorI18nKeys.DeleteStarter,
      ]);
      expect(container.querySelector('[class*="scale-x"]')).toBeNull();
      expect(container.querySelector('[class*="ml-"], [class*="mr-"], [class*="pl-"], [class*="pr-"]')).toBeNull();
    } finally {
      document.documentElement.dir = '';
    }
  });

  it('saves the original values when nothing was edited', () => {
    const { onSave } = renderModal();

    click(getButton(QuickAppEditorI18nKeys.Save));

    expect(onSave).toHaveBeenCalledWith(emptyValues);
  });
});
