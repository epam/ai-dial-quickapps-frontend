import React, { act } from 'react';
import { useForm } from 'react-hook-form';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getQuickApp2FormData, type QuickApp2Form } from '@/form/quickApp2Form';

import ConversationStartersSection from '../ConversationStartersSection';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));

// The list has its own tests; here it only marks where it renders.
vi.mock('../ConversationStartersField', () => ({
  ConversationStartersList: ({ disabled }: { disabled?: boolean }) => (
    <div data-testid="starters-list" data-disabled={String(!!disabled)} />
  ),
}));

// Each control exposes the props this section owns: its label, disabled state
// and hint (tooltip or info caption).
vi.mock('../StartersBehaviourRadioGroup', () => ({
  StartersBehaviourRadioGroup: ({
    disabled,
    tooltip,
  }: {
    disabled?: boolean;
    tooltip?: string;
  }) => <fieldset data-testid="starters-behavior" disabled={disabled} data-hint={tooltip ?? ''} />,
}));

vi.mock('@epam/ai-dial-ui-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@epam/ai-dial-ui-kit')>()),
  DialFormItem: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      {children}
    </div>
  ),
  Input: ({
    labelProps,
    disabled,
    tooltipText,
  }: {
    labelProps: { label: string };
    disabled?: boolean;
    tooltipText?: string;
  }) => <input aria-label={labelProps.label} disabled={disabled} data-hint={tooltipText ?? ''} />,
  Switch: ({
    labelProps,
    disabled,
  }: {
    labelProps: { label: string; caption?: string };
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      role="switch"
      aria-label={labelProps.label}
      disabled={disabled}
      data-info-caption={labelProps.caption ?? ''}
    />
  ),
}));

interface HarnessProps {
  isReadonly?: boolean;
  hasStarters?: boolean;
  startersSettingsTooltip?: string;
  values?: Partial<QuickApp2Form>;
}

const Harness = ({
  isReadonly = false,
  hasStarters = false,
  startersSettingsTooltip,
  values,
}: HarnessProps) => {
  const { control } = useForm<QuickApp2Form>({
    defaultValues: { ...getQuickApp2FormData(undefined, ['model-1'], ['model-1']), ...values },
  });

  return (
    <ConversationStartersSection
      control={control}
      isReadonly={isReadonly}
      hasStarters={hasStarters}
      startersSettingsTooltip={startersSettingsTooltip}
    />
  );
};

let root: Root;
let container: HTMLDivElement;

const STARTER_HINT = 'At least one starter is required to enable settings';
const SHARED_HINT = 'You cannot change the {{context}} of a shared application.';

const render = (props: HarnessProps = {}) => {
  act(() => root.render(<Harness {...props} />));
  // The section starts collapsed; open it to reach its content.
  act(() => container.querySelector<HTMLButtonElement>('[aria-expanded]')?.click());
};

const getIntroText = () =>
  container.querySelector<HTMLInputElement>('input[aria-label="Intro text"]');
const getBehavior = () =>
  container.querySelector<HTMLFieldSetElement>('[data-testid="starters-behavior"]');
const getDisableInputSwitch = () => container.querySelector<HTMLInputElement>('[role="switch"]');

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

describe('ConversationStartersSection', () => {
  it('starts collapsed and expands to the starters list followed by the starters settings', () => {
    act(() => root.render(<Harness />));
    const toggle = container.querySelector('[aria-expanded]');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('[data-testid="starters-list"]')).toBeNull();

    act(() => container.querySelector<HTMLButtonElement>('[aria-expanded]')?.click());

    const order = [
      ...container.querySelectorAll(
        '[data-testid="starters-list"], h3, input[aria-label="Intro text"], [data-testid="starters-behavior"], [role="switch"]',
      ),
    ].map(
      (el) => el.getAttribute('data-testid') ?? el.getAttribute('aria-label') ?? el.textContent,
    );
    expect(order).toEqual([
      'starters-list',
      'Starters settings',
      'Intro text',
      'starters-behavior',
      'Disable chat input so users can only use starters',
    ]);
    expect(container.textContent).toContain(STARTER_HINT);
  });

  it('disables the settings and shows the starter hint until a complete starter exists', () => {
    render({ hasStarters: false, startersSettingsTooltip: STARTER_HINT });

    expect(getIntroText()?.disabled).toBe(true);
    expect(getIntroText()?.getAttribute('data-hint')).toBe(STARTER_HINT);
    expect(getBehavior()?.disabled).toBe(true);
    expect(getBehavior()?.getAttribute('data-hint')).toBe(STARTER_HINT);
    expect(getDisableInputSwitch()?.disabled).toBe(true);
    expect(getDisableInputSwitch()?.getAttribute('data-info-caption')).toBe(STARTER_HINT);
  });

  it('enables the settings without a hint once a complete starter exists', () => {
    render({ hasStarters: true });

    expect(getIntroText()?.disabled).toBe(false);
    expect(getBehavior()?.disabled).toBe(false);
    expect(getDisableInputSwitch()?.disabled).toBe(false);
    expect(getDisableInputSwitch()?.getAttribute('data-info-caption')).toBe('');
  });

  it('disables everything and shows the shared-application hint for a shared app', () => {
    render({ isReadonly: true, hasStarters: true, startersSettingsTooltip: SHARED_HINT });

    expect(
      container.querySelector('[data-testid="starters-list"]')?.getAttribute('data-disabled'),
    ).toBe('true');
    expect(getIntroText()?.disabled).toBe(true);
    expect(getBehavior()?.getAttribute('data-hint')).toBe(SHARED_HINT);
    expect(getDisableInputSwitch()?.getAttribute('data-info-caption')).toBe(SHARED_HINT);
  });

  it('shows no warning when the prompt is only populated and chat input is disabled', () => {
    render({ hasStarters: true, values: { autoSubmit: false, chatMessageInputDisabled: true } });

    expect(container.textContent).not.toContain("won't be able to edit");
    expect(getDisableInputSwitch()?.getAttribute('data-info-caption')).toBe('');
  });
});
