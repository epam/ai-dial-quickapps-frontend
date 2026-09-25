import { AuthProviderInfo, UserProfile } from '@/types/auth';
import { chatApiFetch, resetCsrfToken } from '@/utils/chat-api-fetch';

const AUTH_ME_URL = '/api/v1/auth/me';
const AUTH_PROVIDERS_URL = '/api/v1/auth/providers';
const AUTH_LOGOUT_URL = '/api/v1/auth/logout';

export class UnauthorizedError extends Error {
  constructor() {
    super('Not authenticated');
    this.name = 'UnauthorizedError';
  }
}

export const getCurrentUser = async (): Promise<UserProfile> => {
  const res = await chatApiFetch(AUTH_ME_URL);
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new Error(`Failed to load current user (${res.status})`);
  return res.json() as Promise<UserProfile>;
};

export const getAuthProviders = async (): Promise<AuthProviderInfo[]> => {
  const res = await chatApiFetch(AUTH_PROVIDERS_URL);
  if (!res.ok) throw new Error(`Failed to load auth providers (${res.status})`);
  return res.json() as Promise<AuthProviderInfo[]>;
};

export const logout = async (): Promise<void> => {
  // `redirect: 'manual'` — chat-api 302s a cookie-authenticated caller to the
  // IdP's end-session endpoint; we only need our own cookie cleared, not to
  // follow that redirect from a `fetch` call.
  await chatApiFetch(AUTH_LOGOUT_URL, { method: 'POST', redirect: 'manual' });
  resetCsrfToken();
};

export const buildLoginUrl = (providerId: string, callbackUrl: string): string =>
  `/api/v1/auth/login/${encodeURIComponent(providerId)}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
