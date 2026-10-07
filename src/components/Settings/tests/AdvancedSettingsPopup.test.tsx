import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdvancedSettingsValues } from '@/types/advanced-settings';

import AdvancedSettingsPopup from '../AdvancedSettingsPopup';

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

interface MockNumberInputProps {
  id: string;
  labelProps: { label: string; htmlFor: string };
  value: string;
  caption?: string;
  error?: string;
  invalid?: boolean;
  onChange: (value?: number | string) => void;
}

interface MockSwitchProps {
  isOn: boolean;
  labelProps: { label: string };
  caption?: string;
  onChange: (value: boolean) => void;
}

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  ButtonAppearance: { Link: 'link' },
  ButtonVariant: { Primary: 'primary', Neutral: 'neutral' },
  PopupSize: { Sm: 'sm' },
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
  NumberInput: ({ id, labelProps, value, caption, error, invalid, onChange }: MockNumberInputProps) => (
    <div>
      <label htmlFor={labelProps.htmlFor}>{labelProps.label}</label>
      <input
        id={id}
        value={value}
        aria-invalid={invalid}
        aria-describedby={`${id}-caption`}
        onChange={(event) => onChange(event.target.value)}
      />
      <span id={`${id}-caption`}>{error ?? caption}</span>
    </div>
  ),
  Switch: ({ isOn, labelProps, caption, onChange }: MockSwitchProps) => (
    <div>
      <button type="button" role="switch" aria-checked={isOn} aria-label={labelProps.label} onClick={() => onChange(!isOn)} />
      <span>{caption}</span>
    </div>
  ),
}));

const initialValues: AdvancedSettingsValues = { maxInputAttachments: 50, timestamp: true, fileTools: false };

let root: Root;
let container: HTMLDivElement;

const renderPopup = (props: Partial<React.ComponentProps<typeof AdvancedSettingsPopup>> = {}) => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  act(() =>
    root.render(
      <AdvancedSettingsPopup
        isOpen
        advancedSettings={initialValues}
        onSave={onSave}
        onClose={onClose}
        {...props}
      />,
    ),
  );
  return { onSave, onClose };
};

const getButton = (name: string) =>
  [...container.querySelectorAll('button')].find(
    (button) => (button.getAttribute('aria-label') ?? button.textContent) === name,
  ) as HTMLButtonElement;

const getSwitch = (name: string) =>
  container.querySelector(`[role="switch"][aria-label="${name}"]`) as HTMLButtonElement;

const getInputByLabel = (text: string) => {
  const label = [...container.querySelectorAll('label')].find((item) => item.textContent === text);
  return document.getElementById(label?.htmlFor ?? '') as HTMLInputElement;
};

const typeInto = (input: HTMLInputElement, value: string) => {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

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

describe('AdvancedSettingsPopup', () => {
  it('renders a named dialog with the three settings in order, seeded from the form', () => {
    renderPopup();

    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Advanced settings');
    const input = getInputByLabel('Maximum attachments amount user can add');
    expect(input.value).toBe('50');
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Valid only for the cases when attachments enabled for the agent',
    );
    expect(getSwitch('Time awareness').getAttribute('aria-checked')).toBe('true');
    expect(getSwitch('Built-in file tools').getAttribute('aria-checked')).toBe('false');

    const body = container.querySelector('[data-testid="body"]') as HTMLElement;
    expect(body.textContent).toContain('Gives the agent the current date and time');
    expect(body.textContent).toContain('Lets the agent browse, search, read, and edit files');
    const controls = [...body.querySelectorAll('input, [role="switch"]')].map(
      (element) => element.getAttribute('aria-label') ?? 'max attachments',
    );
    expect(controls).toEqual(['max attachments', 'Time awareness', 'Built-in file tools']);
  });

  it('renders nothing when closed', () => {
    renderPopup({ isOpen: false });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('saves the edited draft and closes', () => {
    const { onSave, onClose } = renderPopup();

    act(() => getSwitch('Built-in file tools').click());
    act(() => getSwitch('Time awareness').click());
    typeInto(getInputByLabel('Maximum attachments amount user can add'), '10');
    act(() => getButton('Save').click());

    expect(onSave).toHaveBeenCalledWith({ maxInputAttachments: 10, timestamp: false, fileTools: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('saves an empty max attachments value', () => {
    const { onSave } = renderPopup();

    typeInto(getInputByLabel('Maximum attachments amount user can add'), '');
    act(() => getButton('Save').click());

    expect(onSave).toHaveBeenCalledWith({ ...initialValues, maxInputAttachments: '' });
  });

  it('blocks Save and shows an error for a max attachments value that is not a positive integer', () => {
    const { onSave, onClose } = renderPopup();

    const input = getInputByLabel('Maximum attachments amount user can add');
    typeInto(input, '0');
    act(() => getButton('Save').click());

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Enter a whole number greater than 0',
    );

    typeInto(input, '3');
    expect(input.getAttribute('aria-invalid')).toBe('false');
  });

  it('shows an existing form error for max attachments on open', () => {
    renderPopup({ maxInputAttachmentsError: 'Too small' });

    expect(getInputByLabel('Maximum attachments amount user can add').getAttribute('aria-invalid')).toBe('true');
  });

  it.each(['Close advanced settings', 'Close'])('discards the draft when dismissed with %s', (name) => {
    const { onSave, onClose } = renderPopup();

    act(() => getSwitch('Built-in file tools').click());
    act(() => getButton(name).click());

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses only logical layout classes and no mirrored icons', () => {
    renderPopup();

    expect(container.innerHTML).not.toMatch(/class="[^"]*\b(ml|mr|pl|pr|left|right|text-left|text-right)-/);
    expect(container.innerHTML).not.toContain('scale-x-[-1]');
  });
});
