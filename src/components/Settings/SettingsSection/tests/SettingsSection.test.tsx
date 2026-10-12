import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';

import SettingsSection from '../SettingsSection';

interface MockButtonProps {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}

vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));
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

vi.mock('@/components/Settings/AdvancedSettingsPopup/AdvancedSettingsPopup', () => ({
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
  codeInterpreter: false,
  addAttachment: false,
  webFetch: false,
};

const renderSection = (
  isReadonly: boolean,
  onAdvancedSettingsSave = vi.fn(),
  { isTemperatureAvailable = true, isProcessLargeFilesAvailable = false } = {},
) =>
  dom.render(
    <SettingsSection
      isReadonly={isReadonly}
      advancedSettings={advancedSettings}
      isTemperatureAvailable={isTemperatureAvailable}
      isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
      isCodeInterpreterEnabled={false}
      isAddAttachmentEnabled={false}
      isWebFetchEnabled={false}
      onAdvancedSettingsSave={onAdvancedSettingsSave}
    />,
  );

const dom = setupTestRoot();

const getAdvancedButton = () => getButton('Advanced') as HTMLButtonElement;

afterEach(() => {
  document.documentElement.removeAttribute('dir');
});

describe('SettingsSection', () => {
  it('renders the Settings row with an Advanced action', () => {
    renderSection(false);

    expect(dom.container.querySelector('h3')?.textContent).toBe('Settings');
    expect(getAdvancedButton().disabled).toBe(false);
    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens and closes the popup', () => {
    renderSection(false);

    click(getAdvancedButton());
    expect(dom.container.querySelector('[role="dialog"]')).not.toBeNull();

    click(getButton('Close popup'));
    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('reopens with the form values instead of a discarded draft', () => {
    renderSection(false);

    click(getAdvancedButton());
    const fileToolsSwitch = () =>
      dom.container.querySelector('[role="switch"]') as HTMLButtonElement;
    click(fileToolsSwitch());
    expect(fileToolsSwitch().getAttribute('aria-checked')).toBe('true');
    click(getButton('Close popup'));

    click(getAdvancedButton());
    expect(fileToolsSwitch().getAttribute('aria-checked')).toBe('false');
  });

  it('passes saved popup values to the form', () => {
    const onAdvancedSettingsSave = vi.fn();
    renderSection(false, onAdvancedSettingsSave);

    click(getAdvancedButton());
    click(dom.container.querySelector('[role="switch"]'));
    click(getButton('Save popup'));

    expect(onAdvancedSettingsSave).toHaveBeenCalledWith({ ...advancedSettings, fileTools: true });
  });

  it('forwards temperature and process-files availability to the popup', () => {
    renderSection(false, vi.fn(), {
      isTemperatureAvailable: false,
      isProcessLargeFilesAvailable: true,
    });

    click(getAdvancedButton());
    const dialog = dom.container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('data-temperature')).toBe('false');
    expect(dialog.getAttribute('data-process-files')).toBe('true');
  });

  it('disables Advanced when read-only and does not open the popup', () => {
    renderSection(true);

    const button = getAdvancedButton();
    expect(button.disabled).toBe(true);
    click(button);
    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('uses logical layout classes under RTL and stays within narrow layouts', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    renderSection(false);

    const header = dom.container.querySelector('h3')?.parentElement as HTMLElement;
    expect(header.className).toContain('justify-between');
    expect(dom.container.innerHTML).not.toMatch(
      /class="[^"]*\b(ml|mr|pl|pr|left|right|text-left|text-right)-/,
    );
    expect(dom.container.innerHTML).not.toContain('scale-x-[-1]');
  });
});
