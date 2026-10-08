import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommonI18nKeys } from '@/constants/i18n';

import ForbiddenPage from '../ForbiddenPage';

const logout = vi.fn<() => Promise<void>>();

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({ logout }),
}));

let root: Root;
let container: HTMLDivElement;

const getButton = () => {
  const button = container.querySelector<HTMLButtonElement>('button');
  if (!button) throw new Error('Expected a button to be rendered');
  return button;
};

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  logout.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(<ForbiddenPage />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('ForbiddenPage', () => {
  it('shows the title as a heading, the description and a single "Log out" button', () => {
    expect(container.querySelector('h1')?.textContent).toBe(CommonI18nKeys.ForbiddenTitle);
    expect(container.textContent).toContain(CommonI18nKeys.ForbiddenDescription);
    expect(container.querySelectorAll('button')).toHaveLength(1);
    expect(getButton().textContent).toBe(CommonI18nKeys.ForbiddenAction);
  });

  it('hides the badge icon from assistive technology', () => {
    expect(container.querySelector('svg')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('disables the action with the pending label while logging out, then calls logout once', async () => {
    const pending = deferred();
    logout.mockReturnValue(pending.promise);

    act(() => getButton().click());

    expect(logout).toHaveBeenCalledTimes(1);
    expect(getButton().disabled).toBe(true);
    expect(getButton().textContent).toBe(CommonI18nKeys.ForbiddenActionPending);

    await act(async () => pending.resolve());
  });

  it('re-enables "Log out" when logging out fails', async () => {
    const pending = deferred();
    logout.mockReturnValue(pending.promise);

    act(() => getButton().click());
    await act(async () => pending.reject(new Error('network')));

    expect(getButton().disabled).toBe(false);
    expect(getButton().textContent).toBe(CommonI18nKeys.ForbiddenAction);
  });
});
