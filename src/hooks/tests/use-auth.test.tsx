import { act, type FC } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthContext } from '@/context/AuthContext';
import { useAuth } from '@/hooks/use-auth';
import { AuthStatus } from '@/types/auth';

vi.mock('@/context/AuthContext', () => ({ useAuthContext: vi.fn() }));
vi.mock('@/utils/auth-api', () => ({
  buildLoginUrl: (provider: string, callbackUrl: string) => `login:${provider}:${callbackUrl}`,
}));

const mockedUseAuthContext = vi.mocked(useAuthContext);
const refresh = vi.fn(async () => undefined);

let latest: ReturnType<typeof useAuth>;

const Probe: FC = () => {
  latest = useAuth('azure');
  return null;
};

let root: Root;
let container: HTMLDivElement;
let popup: { opener: unknown; close: ReturnType<typeof vi.fn> };

const setStatus = (status: AuthStatus) => {
  mockedUseAuthContext.mockReturnValue({ status, user: null, refresh, logout: vi.fn() });
};

const render = () => act(() => root.render(<Probe />));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  popup = { opener: window, close: vi.fn() };
  vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
  setStatus(AuthStatus.Unauthenticated);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useAuth', () => {
  it('opens the provider login in a popup that returns to /signin/complete', () => {
    render();
    act(() => latest.openLoginWindow());

    expect(window.open).toHaveBeenCalledWith(
      `login:azure:${window.location.origin}/signin/complete`,
      '_blank',
      'width=600,height=600',
    );
    expect(popup.opener).toBeNull();
    expect(latest.isWindowOpen).toBe(true);
  });

  it('opens only one popup at a time', () => {
    render();
    act(() => latest.openLoginWindow());
    act(() => latest.openLoginWindow());

    expect(window.open).toHaveBeenCalledTimes(1);
  });

  it('resets when the browser blocks the popup', () => {
    vi.mocked(window.open).mockReturnValue(null);
    render();
    act(() => latest.openLoginWindow());

    expect(latest.isWindowOpen).toBe(false);
  });

  it('polls the session while the popup is open and on window focus', () => {
    render();
    expect(refresh).not.toHaveBeenCalled();

    act(() => latest.openLoginWindow());
    act(() => vi.advanceTimersByTime(3000));
    expect(refresh).toHaveBeenCalledTimes(1);

    act(() => window.dispatchEvent(new Event('focus')));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('closes the popup and stops polling once signed in', () => {
    render();
    act(() => latest.openLoginWindow());

    setStatus(AuthStatus.Authenticated);
    render();

    expect(popup.close).toHaveBeenCalled();
    expect(latest.isWindowOpen).toBe(false);

    refresh.mockClear();
    act(() => vi.advanceTimersByTime(6000));
    expect(refresh).not.toHaveBeenCalled();
  });
});
