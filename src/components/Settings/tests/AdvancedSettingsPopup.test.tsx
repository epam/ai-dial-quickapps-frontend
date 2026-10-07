import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/hooks/useTranslation', () => ({
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
}));

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

describe('AdvancedSettingsPopup', () => {
  it('renders a named dialog with an empty body', () => {
    act(() => root.render(<AdvancedSettingsPopup isOpen onClose={vi.fn()} />));

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-label')).toBe('Advanced settings');
    expect(container.querySelector('[data-testid="body"]')?.childElementCount).toBe(0);
    expect(container.querySelector('[data-testid="body"]')?.textContent).toBe('');
  });

  it('renders nothing when closed', () => {
    act(() => root.render(<AdvancedSettingsPopup isOpen={false} onClose={vi.fn()} />));

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('exposes keyboard-reachable header close, Close and Save actions that only call onClose', () => {
    const onClose = vi.fn();
    act(() => root.render(<AdvancedSettingsPopup isOpen onClose={onClose} />));

    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.map((button) => button.getAttribute('aria-label') ?? button.textContent)).toEqual([
      'Close advanced settings',
      'Close',
      'Save',
    ]);
    expect(buttons.every((button) => button.tabIndex >= 0)).toBe(true);

    buttons.forEach((button) => act(() => button.click()));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
