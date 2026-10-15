import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthI18nKeys, ButtonsI18nKeys } from '@/constants/translation-keys';
import { setupTestRoot } from '@/test-utils/test-root';

import LoginScreen from '../LoginScreen';

const openLoginWindow = vi.fn();
const authState = { isWindowOpen: false };

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ openLoginWindow, isWindowOpen: authState.isWindowOpen }),
}));

const dom = setupTestRoot();

const renderPrompt = () => {
  dom.render(<LoginScreen provider="keycloak" />);
};

const getButton = () => {
  const button = dom.container.querySelector<HTMLButtonElement>('button');
  if (!button) throw new Error('Expected a button to be rendered');
  return button;
};

beforeEach(() => {
  authState.isWindowOpen = false;
  openLoginWindow.mockReset();
});

describe('LoginScreen', () => {
  it('shows the title as a heading, the description and a single "Log in" button', () => {
    renderPrompt();

    expect(dom.container.querySelector('h1')?.textContent).toBe(AuthI18nKeys.ConfigureTitle);
    expect(dom.container.textContent).toContain(AuthI18nKeys.ConfigureDescription);
    expect(dom.container.querySelectorAll('button')).toHaveLength(1);
    expect(getButton().textContent).toBe(ButtonsI18nKeys.LogIn);
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
    expect(getButton().textContent).toBe(AuthI18nKeys.LoginWindowOpen);
  });

  it('hides the decorative icons from assistive technology', () => {
    renderPrompt();

    const icons = dom.container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThanOrEqual(2);
    icons.forEach((icon) => {
      expect(icon.closest('[aria-hidden="true"]')).not.toBeNull();
    });
  });
});
