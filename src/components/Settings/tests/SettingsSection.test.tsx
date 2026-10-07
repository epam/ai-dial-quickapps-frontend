import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdvancedSettingsValues } from '@/types/advanced-settings';

import SettingsSection from '../SettingsSection';

interface MockButtonProps {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
interface MockPopupProps {
  isOpen: boolean;
  advancedSettings: AdvancedSettingsValues;
  isTemperatureAvailable: boolean;
  isProcessLargeFilesAvailable: boolean;
  onSave: (values: AdvancedSettingsValues) => void;
  onClose: () => void;
}

const MockPopup = ({
  isOpen,
  advancedSettings,
  isTemperatureAvailable,
  isProcessLargeFilesAvailable,
  onSave,
  onClose,
}: MockPopupProps) => {
  const [draft, setDraft] = useState(advancedSettings);
  return isOpen ? (
    <div
      role="dialog"
      data-temperature={String(isTemperatureAvailable)}
      data-process-files={String(isProcessLargeFilesAvailable)}
    >
      <button
        type="button"
        role="switch"
        aria-label="Built-in file tools"
        aria-checked={draft.fileTools}
        onClick={() => setDraft({ ...draft, fileTools: !draft.fileTools })}
      />
      <button type="button" onClick={onClose}>
        Close popup
      </button>
      <button type="button" onClick={() => onSave(draft)}>
        Save popup
      </button>
    </div>
  ) : null;
};

vi.mock('../AdvancedSettingsPopup', () => ({
  default: (props: MockPopupProps) => <MockPopup {...props} />,
}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  ButtonAppearance: { Link: 'link' },
  ButtonVariant: { Primary: 'primary' },
  DIAL_ICON_SIZE: { SM: 16 },
  DIAL_KIT_ICON_STROKE: 1.5,
  ElementSize: { Small: 'small' },
  mergeClasses: (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' '),
  Button: ({ label, disabled, onClick }: MockButtonProps) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));

const advancedSettings: AdvancedSettingsValues = {
  temperature: 0.5,
  maxInputAttachments: 50,
  timestamp: true,
  fileTools: false,
  processLargeFiles: false,
};

const renderSection = (
  isReadonly: boolean,
  onAdvancedSettingsSave = vi.fn(),
  { isTemperatureAvailable = true, isProcessLargeFilesAvailable = false } = {},
) =>
  act(() =>
    root.render(
      <SettingsSection
        isReadonly={isReadonly}
        advancedSettings={advancedSettings}
        isTemperatureAvailable={isTemperatureAvailable}
        isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
        onAdvancedSettingsSave={onAdvancedSettingsSave}
      />,
    ),
  );

const getButtonByText = (text: string) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === text) as HTMLButtonElement;

let root: Root;
let container: HTMLDivElement;

const getAdvancedButton = () =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === 'Advanced') as HTMLButtonElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  document.documentElement.removeAttribute('dir');
  act(() => root.unmount());
  container.remove();
});

describe('SettingsSection', () => {
  it('renders the Settings row with an Advanced action', () => {
    renderSection(false);

    expect(container.querySelector('h3')?.textContent).toBe('Settings');
    expect(getAdvancedButton().disabled).toBe(false);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens and closes the popup', () => {
    renderSection(false);

    act(() => getAdvancedButton().click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    act(() => getButtonByText('Close popup').click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('reopens with the form values instead of a discarded draft', () => {
    renderSection(false);

    act(() => getAdvancedButton().click());
    const fileToolsSwitch = () => container.querySelector('[role="switch"]') as HTMLButtonElement;
    act(() => fileToolsSwitch().click());
    expect(fileToolsSwitch().getAttribute('aria-checked')).toBe('true');
    act(() => getButtonByText('Close popup').click());

    act(() => getAdvancedButton().click());
    expect(fileToolsSwitch().getAttribute('aria-checked')).toBe('false');
  });

  it('passes saved popup values to the form', () => {
    const onAdvancedSettingsSave = vi.fn();
    renderSection(false, onAdvancedSettingsSave);

    act(() => getAdvancedButton().click());
    act(() => (container.querySelector('[role="switch"]') as HTMLButtonElement).click());
    act(() => getButtonByText('Save popup').click());

    expect(onAdvancedSettingsSave).toHaveBeenCalledWith({ ...advancedSettings, fileTools: true });
  });

  it('forwards temperature and process-files availability to the popup', () => {
    renderSection(false, vi.fn(), { isTemperatureAvailable: false, isProcessLargeFilesAvailable: true });

    act(() => getAdvancedButton().click());
    const dialog = container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('data-temperature')).toBe('false');
    expect(dialog.getAttribute('data-process-files')).toBe('true');
  });

  it('disables Advanced when read-only and does not open the popup', () => {
    renderSection(true);

    const button = getAdvancedButton();
    expect(button.disabled).toBe(true);
    act(() => button.click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('uses logical layout classes under RTL and stays within narrow layouts', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    renderSection(false);

    const header = container.querySelector('h3')?.parentElement as HTMLElement;
    expect(header.className).toContain('justify-between');
    expect(container.innerHTML).not.toMatch(/class="[^"]*\b(ml|mr|pl|pr|left|right|text-left|text-right)-/);
    expect(container.innerHTML).not.toContain('scale-x-[-1]');
  });
});
