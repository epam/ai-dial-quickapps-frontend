import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';

import AttachmentsSection from '../AttachmentsSection';

interface MockSwitchProps {
  isOn: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  'aria-label': string;
}

interface MockAutocompleteTagInputProps {
  value: string[];
  suggestions: { value: string; label: string; description?: string }[];
  error?: string;
  invalid?: boolean;
  disabled?: boolean;
  labelProps: { label: string; required?: boolean };
  placeholder?: string;
  caption?: string;
  tagListLabel?: string;
  getRemoveTagLabel?: (tag: string) => string;
  onChange: (mimeTypes: string[]) => void;
}

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? ''),
  }),
}));
vi.mock('@epam/ai-dial-ui-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@epam/ai-dial-ui-kit')>()),
  Switch: ({ isOn, disabled, onChange, 'aria-label': ariaLabel }: MockSwitchProps) => (
    <button
      type="button"
      role="switch"
      aria-label={ariaLabel}
      aria-checked={isOn}
      disabled={disabled}
      onClick={() => onChange(!isOn)}
    />
  ),
  AutocompleteTagInput: ({
    value,
    suggestions,
    error,
    invalid,
    disabled: isDisabled,
    labelProps,
    placeholder,
    caption,
    tagListLabel,
    getRemoveTagLabel,
    onChange,
  }: MockAutocompleteTagInputProps) => (
    <div
      role="group"
      aria-label={labelProps.label}
      aria-required={labelProps.required}
      aria-invalid={invalid}
      data-placeholder={placeholder}
      data-caption={caption}
      data-tag-list-label={tagListLabel}
      data-remove-label={getRemoveTagLabel?.('image/png')}
      data-first-suggestion={JSON.stringify(suggestions[0])}
    >
      <output data-testid="attachment-types">{value.join('|')}</output>
      <button type="button" disabled={isDisabled} onClick={() => onChange([...value, 'image/png'])}>
        Add PNG
      </button>
      <button type="button" disabled={isDisabled} onClick={() => onChange(value.slice(1))}>
        Remove first
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  ),
}));

interface TestHostProps {
  initialValue?: string[];
  isReadonly?: boolean;
  onChange?: (mimeTypes: string[]) => void;
  onEnabledChange?: (isEnabled: boolean) => void;
}

// Mirrors the Quick App form: `attachmentsEnabled` is seeded from the saved types,
// turning it off clears them, and enabled-but-empty is a required error.
const TestHost = ({
  initialValue = [],
  isReadonly = false,
  onChange,
  onEnabledChange,
}: TestHostProps) => {
  const [isEnabled, setIsEnabled] = useState(initialValue.length > 0);
  const [value, setValue] = useState(initialValue);
  return (
    <AttachmentsSection
      isEnabled={isEnabled}
      value={value}
      error={
        isEnabled && value.length === 0 ? QuickAppEditorI18nKeys.AttachmentTypesRequired : undefined
      }
      isReadonly={isReadonly}
      onEnabledChange={(next) => {
        onEnabledChange?.(next);
        setIsEnabled(next);
        if (!next) setValue([]);
      }}
      onChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
    />
  );
};

let root: Root;
let container: HTMLDivElement;

const getSwitch = () => container.querySelector('[role="switch"]') as HTMLButtonElement;
const getField = () => container.querySelector('[aria-label="Attachment types"]');
const getButton = (text: string) =>
  [...container.querySelectorAll('button')].find(
    (button) => button.textContent === text,
  ) as HTMLButtonElement;
const getTypes = () => container.querySelector('[data-testid="attachment-types"]')?.textContent;
const click = (element: HTMLElement) => act(() => element.click());

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

describe('AttachmentsSection', () => {
  it('shows the title, description, and an off switch without a field when no types are saved', () => {
    act(() => root.render(<TestHost />));

    expect(container.textContent).toContain('Attachments');
    expect(container.textContent).toContain('Lets end users upload files during a conversation.');
    expect(getSwitch().getAttribute('aria-label')).toBe('Attachments');
    expect(getSwitch().getAttribute('aria-checked')).toBe('false');
    expect(getField()).toBeNull();
  });

  it('configures the kit field with the translated copy and the MIME suggestions', () => {
    act(() => root.render(<TestHost initialValue={['application/pdf']} />));

    const field = getField() as HTMLElement;
    expect(field.getAttribute('aria-required')).toBe('true');
    expect(field.dataset.placeholder).toBe('Enter attachment types');
    expect(field.dataset.caption).toContain('Choose from suggested MIME types');
    expect(field.dataset.tagListLabel).toBe('Attachment types');
    expect(field.dataset.removeLabel).toBe('Remove image/png');
    expect(JSON.parse(field.dataset.firstSuggestion ?? '{}')).toEqual({
      value: 'image/gif',
      label: 'GIF',
      description: 'image/gif',
    });
  });

  it('shows the switch on with the saved types in the field', () => {
    act(() => root.render(<TestHost initialValue={['application/pdf']} />));

    expect(getSwitch().getAttribute('aria-checked')).toBe('true');
    expect(getTypes()).toBe('application/pdf');
  });

  it('reports the switch turning off and hides the field', () => {
    const onEnabledChange = vi.fn();
    act(() =>
      root.render(
        <TestHost initialValue={['application/pdf']} onEnabledChange={onEnabledChange} />,
      ),
    );

    click(getSwitch());

    expect(onEnabledChange).toHaveBeenCalledWith(false);
    expect(getField()).toBeNull();
  });

  it('does not change the value when the switch is turned on and off without adding a type', () => {
    const onChange = vi.fn();
    act(() => root.render(<TestHost onChange={onChange} />));

    click(getSwitch());
    expect(getField()).not.toBeNull();
    click(getSwitch());

    expect(onChange).not.toHaveBeenCalled();
    expect(getField()).toBeNull();
  });

  it('passes the translated form error to the field while on with no types', () => {
    act(() => root.render(<TestHost />));

    click(getSwitch());

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Select at least one attachment type',
    );
  });

  it('forwards added types to the form', () => {
    const onChange = vi.fn();
    act(() => root.render(<TestHost initialValue={['application/pdf']} onChange={onChange} />));

    click(getButton('Add PNG'));

    expect(onChange).toHaveBeenLastCalledWith(['application/pdf', 'image/png']);
  });

  it('keeps the switch on when the last type is removed', () => {
    act(() => root.render(<TestHost initialValue={['application/pdf']} />));

    click(getButton('Remove first'));

    expect(getSwitch().getAttribute('aria-checked')).toBe('true');
    expect(getField()).not.toBeNull();
  });

  it('disables the switch and the field when read-only', () => {
    act(() => root.render(<TestHost initialValue={['application/pdf']} isReadonly />));

    expect(getSwitch().disabled).toBe(true);
    expect(getButton('Add PNG').disabled).toBe(true);
  });
});
