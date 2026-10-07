import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildLoginUrl,
  getAuthProviders,
  getCurrentUser,
  logout,
  UnauthorizedError,
} from '@/utils/auth-api';
import { chatApiFetch, resetCsrfToken } from '@/utils/chat-api-fetch';

vi.mock('@/utils/chat-api-fetch', () => ({ chatApiFetch: vi.fn(), resetCsrfToken: vi.fn() }));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getCurrentUser', () => {
  it('returns the session user', async () => {
    vi.mocked(chatApiFetch).mockResolvedValue(json(200, { sub: 'u1', bucket: 'b' }));

    await expect(getCurrentUser()).resolves.toEqual({ sub: 'u1', bucket: 'b' });
    expect(chatApiFetch).toHaveBeenCalledWith('/api/v1/auth/me');
  });

  it('throws UnauthorizedError on 401', async () => {
    vi.mocked(chatApiFetch).mockResolvedValue(json(401, {}));

    await expect(getCurrentUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('throws a generic error on other failures', async () => {
    vi.mocked(chatApiFetch).mockResolvedValue(json(500, {}));

    await expect(getCurrentUser()).rejects.toThrow('Failed to load current user (500)');
  });
});

describe('getAuthProviders', () => {
  it('returns the configured providers', async () => {
    vi.mocked(chatApiFetch).mockResolvedValue(json(200, [{ id: 'azure' }]));

    await expect(getAuthProviders()).resolves.toEqual([{ id: 'azure' }]);
  });

  it('throws when the request fails', async () => {
    vi.mocked(chatApiFetch).mockResolvedValue(json(503, {}));

    await expect(getAuthProviders()).rejects.toThrow('(503)');
  });
});

describe('logout', () => {
  it('posts without following the IdP redirect and drops the CSRF token', async () => {
    vi.mocked(chatApiFetch).mockResolvedValue(new Response(null, { status: 200 }));

    await logout();

    expect(chatApiFetch).toHaveBeenCalledWith('/api/v1/auth/logout', {
      method: 'POST',
      redirect: 'manual',
    });
    expect(resetCsrfToken).toHaveBeenCalled();
  });
});

describe('buildLoginUrl', () => {
  it('encodes the provider and the callback URL', () => {
    expect(buildLoginUrl('my provider', 'https://app/signin/complete?a=1')).toBe(
      '/api/v1/auth/login/my%20provider?callbackUrl=https%3A%2F%2Fapp%2Fsignin%2Fcomplete%3Fa%3D1',
    );
  });
});
