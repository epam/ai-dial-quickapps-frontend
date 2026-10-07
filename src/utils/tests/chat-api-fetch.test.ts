import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { chatApiFetch, getCsrfToken, resetCsrfToken } from '@/utils/chat-api-fetch';

const fetchMock = vi.fn<typeof fetch>();

const response = (status: number, token?: string, body?: unknown): Response =>
  new Response(body == null ? null : JSON.stringify(body), {
    status,
    headers: token ? { 'X-CSRF-Token': token } : {},
  });

const sentHeaders = (call: number): Headers => fetchMock.mock.calls[call][1]?.headers as Headers;

beforeEach(() => {
  resetCsrfToken();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chatApiFetch', () => {
  it('always sends credentials and remembers the CSRF token from responses', async () => {
    fetchMock.mockResolvedValue(response(200, 'token-1'));

    await chatApiFetch('/api/v1/deployments');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/deployments',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
    expect(getCsrfToken()).toBe('token-1');
  });

  it('attaches the CSRF token to mutating requests only', async () => {
    fetchMock.mockResolvedValue(response(200, 'token-1'));
    await chatApiFetch('/api/v1/auth/me');

    await chatApiFetch('/api/v1/files', { method: 'POST' });
    await chatApiFetch('/api/v1/files');

    expect(sentHeaders(0).get('X-CSRF-Token')).toBeNull();
    expect(sentHeaders(1).get('X-CSRF-Token')).toBe('token-1');
    expect(sentHeaders(2).get('X-CSRF-Token')).toBeNull();
  });

  it('keeps the caller headers', async () => {
    fetchMock.mockResolvedValue(response(200));

    await chatApiFetch('/x', { method: 'PUT', headers: { 'Content-Type': 'application/json' } });

    expect(sentHeaders(0).get('Content-Type')).toBe('application/json');
  });

  it('reprimes the token and retries once on 403 CSRF_INVALID', async () => {
    fetchMock
      .mockResolvedValueOnce(response(403, undefined, { code: 'CSRF_INVALID' }))
      .mockResolvedValueOnce(response(200, 'fresh-token'))
      .mockResolvedValueOnce(response(200));

    const res = await chatApiFetch('/api/v1/files', { method: 'DELETE' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/auth/me');
    expect(sentHeaders(2).get('X-CSRF-Token')).toBe('fresh-token');
  });

  it('does not retry other 403 responses', async () => {
    fetchMock.mockResolvedValue(response(403, undefined, { code: 'FORBIDDEN' }));

    const res = await chatApiFetch('/api/v1/files', { method: 'POST' });

    expect(res.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a 403 on GET requests', async () => {
    fetchMock.mockResolvedValue(response(403, undefined, { code: 'CSRF_INVALID' }));

    await chatApiFetch('/api/v1/files');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('forgets the token after reset', async () => {
    fetchMock.mockResolvedValue(response(200, 'token-1'));
    await chatApiFetch('/x');

    resetCsrfToken();

    expect(getCsrfToken()).toBeUndefined();
  });
});
