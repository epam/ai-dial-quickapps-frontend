const AUTH_ME_URL = '/api/v1/auth/me';
const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_INVALID_CODE = 'CSRF_INVALID';

// chat-api rotates the CSRF token on every response that carries a session
// (it's handed to us via a response header, not readable from the cookie
// itself since the session cookie is httpOnly) — keep the latest one in
// memory and attach it to every mutating request. Shared by every chat-api
// caller (auth-api.ts, the generated @epam/ai-dial-chat-api-client instances
// in chat-api-client.ts, and any hand-written call that can't go through
// either, e.g. the XHR upload path in dial-files-api.ts).
let csrfToken: string | undefined;

export const getCsrfToken = (): string | undefined => csrfToken;

const captureCsrfToken = (res: Response): void => {
  const token = res.headers.get(CSRF_HEADER);
  if (token) csrfToken = token;
};

const isCsrfInvalid = async (res: Response): Promise<boolean> => {
  if (res.status !== 403) return false;
  try {
    const body = (await res.clone().json()) as { code?: string };
    return body.code === CSRF_INVALID_CODE;
  } catch {
    return false;
  }
};

/**
 * Reprimes `csrfToken` from `/api/v1/auth/me` without depending on
 * `auth-api.ts` (which itself calls `chatApiFetch`) — kept self-contained
 * here to avoid a circular import.
 */
const reprimeCsrfToken = async (): Promise<void> => {
  try {
    const res = await fetch(AUTH_ME_URL, { credentials: 'include' });
    captureCsrfToken(res);
  } catch {
    // Best-effort — the retry below will simply fail again with whatever
    // token (or lack of one) we already had.
  }
};

/**
 * A `fetch`-compatible wrapper for every chat-api call: always sends
 * credentials, attaches the CSRF header on non-GET requests, and retries
 * once after repriming the token on a `403 CSRF_INVALID`.
 */
export const chatApiFetch: typeof fetch = async (input, init) => {
  const method = init?.method ?? 'GET';
  const headers = new Headers(init?.headers);
  if (method !== 'GET' && csrfToken) headers.set(CSRF_HEADER, csrfToken);

  const res = await fetch(input, { ...init, method, headers, credentials: 'include' });
  captureCsrfToken(res);

  if (method !== 'GET' && (await isCsrfInvalid(res))) {
    await reprimeCsrfToken();
    const retryHeaders = new Headers(init?.headers);
    if (csrfToken) retryHeaders.set(CSRF_HEADER, csrfToken);
    const retryRes = await fetch(input, {
      ...init,
      method,
      headers: retryHeaders,
      credentials: 'include',
    });
    captureCsrfToken(retryRes);
    return retryRes;
  }

  return res;
};

export const resetCsrfToken = (): void => {
  csrfToken = undefined;
};
