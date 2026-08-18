import { createSDK, DIAL_SDK } from '@epam/ai-dial-typescript-sdk';

// Cached per baseUrl (not per token) — the auth token is passed per-call as a
// header override, which `openapi-fetch` merges on top of the client's
// defaults. In practice there is a single baseUrl (`DIAL_CORE_URL`), but
// `getDialAuth` can also resolve one from a session cookie, so we key on it
// instead of assuming a single global instance.
const sdkCache = new Map<string, DIAL_SDK>();

export const getDialSDK = (baseUrl: string): DIAL_SDK => {
  const cached = sdkCache.get(baseUrl);
  if (cached) return cached;

  const sdk = createSDK({ baseUrl });
  sdkCache.set(baseUrl, sdk);
  return sdk;
};

export const withAuthHeader = (token: string): { headers: Record<string, string> } => ({
  headers: { Authorization: `Bearer ${token}` },
});
