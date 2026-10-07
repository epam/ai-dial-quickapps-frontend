import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SettingsSection from '../SettingsSection';

interface MockButtonProps {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('../AdvancedSettingsPopup', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div role="dialog">
        <button type="button" onClick={onClose}>
          Close popup
        </button>
      </div>
    ) : null,
}));
vi.mock('@epam/ai-dial-ui-kit', () => ({
  ButtonAppearance: { Link: 'link' },
  ButtonVariant: { Primary: 'primary' },
  ElementSize: { Small: 'small' },
  Button: ({ label, disabled, onClick }: MockButtonProps) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));

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
    act(() => root.render(<SettingsSection isReadonly={false} />));

    expect(container.querySelector('h3')?.textContent).toBe('Settings');
    expect(getAdvancedButton().disabled).toBe(false);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens and closes the popup', () => {
    act(() => root.render(<SettingsSection isReadonly={false} />));

    act(() => getAdvancedButton().click());
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();

    act(() => (container.querySelector('[role="dialog"] button') as HTMLButtonElement).click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('disables Advanced when read-only and does not open the popup', () => {
    act(() => root.render(<SettingsSection isReadonly />));

    const button = getAdvancedButton();
    expect(button.disabled).toBe(true);
    act(() => button.click());
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('uses logical layout classes under RTL and stays within narrow layouts', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    act(() => root.render(<SettingsSection isReadonly={false} />));

    const section = container.querySelector('section') as HTMLElement;
    expect(section.className).toContain('justify-between');
    expect(section.className).toContain('text-start');
    expect(section.className).not.toMatch(/(^|\s)(ml|mr|pl|pr|left|right|text-left|text-right)-/);
    expect(container.innerHTML).not.toContain('scale-x-[-1]');
  });
});
