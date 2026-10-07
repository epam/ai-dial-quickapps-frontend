const WILDCARD_ORIGIN = '*';

/**
 * Accepts `allowedOrigin` either as a string array or as a single string with
 * comma- and/or whitespace-separated origins. Trailing slashes are dropped so
 * `https://chat.example.com/` still matches `event.origin`.
 */
export const parseAllowedOrigins = (value: unknown): string[] => {
  let raw: unknown[] = [];
  if (typeof value === 'string') raw = value.split(/[\s,]+/);
  else if (Array.isArray(value)) raw = value;

  return raw
    .filter((origin): origin is string => typeof origin === 'string')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

// No configured origins means "any origin" — the editor's long-standing default for local dev.
const isWildcard = (allowedOrigins: string[]): boolean =>
  !allowedOrigins.length || allowedOrigins.includes(WILDCARD_ORIGIN);

export const isOriginAllowed = (origin: string, allowedOrigins: string[] = []): boolean =>
  isWildcard(allowedOrigins) || allowedOrigins.includes(origin);

/**
 * `postMessage` takes a single target origin, so with several allowed origins
 * the message is posted once per origin: the browser silently drops every copy
 * whose target doesn't match the parent's actual origin, so only the real host
 * receives it.
 */
export const postToHost = (message: unknown, allowedOrigins: string[] = []): void => {
  if (isWildcard(allowedOrigins)) {
    window.parent.postMessage(message, WILDCARD_ORIGIN);
    return;
  }
  allowedOrigins.forEach((origin) => {
    try {
      window.parent.postMessage(message, origin);
    } catch (error) {
      // A malformed entry (e.g. missing scheme) makes postMessage throw; keep posting to the rest.
      console.error(`Invalid allowedOrigin entry "${origin}"`, error);
    }
  });
};
