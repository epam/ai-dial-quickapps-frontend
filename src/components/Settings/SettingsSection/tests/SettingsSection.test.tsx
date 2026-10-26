import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
import type { AdvancedSettingsValues } from '@/types/advanced-settings';

import SettingsSection from '../SettingsSection';
import { ApplicationEditorI18nKeys, BasicI18nKeys } from '@/constants/translation-keys';

interface MockButtonProps {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}

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
        aria-label={ApplicationEditorI18nKeys.AdvancedSettingsBuiltInFileTools}
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
vi.mock('@epam/ai-dial-ui-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@epam/ai-dial-ui-kit')>()),
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
  addAttachment: false,
  webFetch: false,
};

const renderSection = (
  onAdvancedSettingsSave = vi.fn(),
  { isTemperatureAvailable = true, isProcessLargeFilesAvailable = false } = {},
) =>
  dom.render(
    <SettingsSection
      advancedSettings={advancedSettings}
      isTemperatureAvailable={isTemperatureAvailable}
      isProcessLargeFilesAvailable={isProcessLargeFilesAvailable}
      isAddAttachmentEnabled={false}
      isWebFetchEnabled={false}
      isAttachmentsEnabled={false}
      onAdvancedSettingsSave={onAdvancedSettingsSave}
    />,
  );

const dom = setupTestRoot();

const getAdvancedButton = () =>
  getButton(ApplicationEditorI18nKeys.AdvancedSettingsAdvanced) as HTMLButtonElement;

afterEach(() => {
  document.documentElement.removeAttribute('dir');
});

describe('SettingsSection', () => {
  it('renders the Settings row with an Advanced action', () => {
    renderSection();

    expect(dom.container.querySelector('h3')?.textContent).toBe(BasicI18nKeys.Settings);
    expect(getAdvancedButton().disabled).toBe(false);
    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens and closes the popup', () => {
    renderSection();

    click(getAdvancedButton());
    expect(dom.container.querySelector('[role="dialog"]')).not.toBeNull();

    click(getButton('Close popup'));
    expect(dom.container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('reopens with the form values instead of a discarded draft', () => {
    renderSection();

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
    renderSection(onAdvancedSettingsSave);

    click(getAdvancedButton());
    click(dom.container.querySelector('[role="switch"]'));
    click(getButton('Save popup'));

    expect(onAdvancedSettingsSave).toHaveBeenCalledWith({ ...advancedSettings, fileTools: true });
  });

  it('forwards temperature and process-files availability to the popup', () => {
    renderSection(vi.fn(), {
      isTemperatureAvailable: false,
      isProcessLargeFilesAvailable: true,
    });

    click(getAdvancedButton());
    const dialog = dom.container.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('data-temperature')).toBe('false');
    expect(dialog.getAttribute('data-process-files')).toBe('true');
  });

  it('uses logical layout classes under RTL and stays within narrow layouts', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    renderSection();

    const header = dom.container.querySelector('h3')?.parentElement as HTMLElement;
    expect(header.className).toContain('justify-between');
    expect(dom.container.innerHTML).not.toMatch(
      /class="[^"]*\b(ml|mr|pl|pr|left|right|text-left|text-right)-/,
    );
    expect(dom.container.innerHTML).not.toContain('scale-x-[-1]');
  });
});
