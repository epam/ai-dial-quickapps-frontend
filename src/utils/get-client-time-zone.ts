/**
 * The browser's IANA time zone (e.g. `Europe/Warsaw`), or `undefined` when it is unavailable
 * or `Intl` does not accept it, so callers omit the value instead of sending an invalid one.
 */
export const getClientTimeZone = (): string | undefined => {
  try {
    const timeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timeZone) return undefined;
    // Throws a RangeError for a name `Intl` cannot resolve.
    new Intl.DateTimeFormat(undefined, { timeZone });
    return timeZone;
  } catch {
    return undefined;
  }
};
