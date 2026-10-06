import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommonI18nKeys } from '@/constants/i18n';

import LoginScreen from '../LoginScreen';

const openLoginWindow = vi.fn();
const authState = { isWindowOpen: false };

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ openLoginWindow, isWindowOpen: authState.isWindowOpen }),
}));

let root: Root;
let container: HTMLDivElement;

const renderPrompt = () => {
  act(() => root.render(<LoginScreen provider="keycloak" />));
};

const getButton = () => {
  const button = container.querySelector<HTMLButtonElement>('button');
  if (!button) throw new Error('Expected a button to be rendered');
  return button;
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  authState.isWindowOpen = false;
  openLoginWindow.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('LoginScreen', () => {
  it('shows the title as a heading, the description and a single "Log in" button', () => {
    renderPrompt();

    expect(container.querySelector('h1')?.textContent).toBe(CommonI18nKeys.LoginScreenTitle);
    expect(container.textContent).toContain(CommonI18nKeys.LoginScreenDescription);
    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(getButton().textContent).toBe(CommonI18nKeys.LoginScreenAction);
    expect(getButton().disabled).toBe(false);
  });

  it('starts the sign-in popup when "Log in" is clicked', () => {
    renderPrompt();

    act(() => getButton().click());

    expect(openLoginWindow).toHaveBeenCalledTimes(1);
  });

  it('disables the action and shows the pending label while the sign-in window is open', () => {
    authState.isWindowOpen = true;
    renderPrompt();

    expect(getButton().disabled).toBe(true);
    expect(getButton().textContent).toBe(CommonI18nKeys.LoginScreenWindowOpen);
  });

  it('hides the decorative icons from assistive technology', () => {
    renderPrompt();

    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThanOrEqual(2);
    icons.forEach((icon) => {
      expect(icon.closest('[aria-hidden="true"]')).not.toBeNull();
    });
  });
});
