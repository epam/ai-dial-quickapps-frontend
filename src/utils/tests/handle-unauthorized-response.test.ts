import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logout } from '@/utils/auth-api';
import {
  handleUnauthorized401,
  handleUnauthorizedResponse,
} from '@/utils/handle-unauthorized-response';

vi.mock('@/utils/auth-api', () => ({ logout: vi.fn() }));

const RELOAD_TS_KEY = 'dial_auth_401_ts';
const NOW = 1_000_000;

const reload = vi.fn();
let originalLocation: Location;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  sessionStorage.clear();
  originalLocation = window.location;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, href: '/editor', reload },
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  vi.useRealTimers();
});

describe('handleUnauthorized401', () => {
  it('reloads once on the first 401 and remembers when', () => {
    handleUnauthorized401();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_TS_KEY)).toBe(String(NOW));
    expect(logout).not.toHaveBeenCalled();
  });

  it('signs out instead of reloading again when another 401 follows within 30s', async () => {
    vi.mocked(logout).mockResolvedValue();
    sessionStorage.setItem(RELOAD_TS_KEY, String(NOW - 10_000));

    handleUnauthorized401();
    await vi.waitFor(() => expect(window.location.href).toBe('/'));

    expect(reload).not.toHaveBeenCalled();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_TS_KEY)).toBeNull();
  });

  it('still leaves the app when signing out fails', async () => {
    vi.mocked(logout).mockRejectedValue(new Error('offline'));
    sessionStorage.setItem(RELOAD_TS_KEY, String(NOW - 1_000));

    handleUnauthorized401();

    await vi.waitFor(() => expect(window.location.href).toBe('/'));
  });

  it('treats a 401 after the 30s window as a fresh one and reloads', () => {
    sessionStorage.setItem(RELOAD_TS_KEY, String(NOW - 31_000));

    handleUnauthorized401();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(logout).not.toHaveBeenCalled();
  });
});

describe('handleUnauthorizedResponse', () => {
  it('handles a 401 response and reports it', () => {
    expect(handleUnauthorizedResponse(new Response(null, { status: 401 }))).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it.each([200, 403, 500])('ignores a %i response', (status) => {
    expect(handleUnauthorizedResponse(new Response(null, { status }))).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
