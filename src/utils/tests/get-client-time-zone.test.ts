import { afterEach, describe, expect, it, vi } from 'vitest';

import { getClientTimeZone } from '@/utils/get-client-time-zone';

const mockResolvedTimeZone = (timeZone: string | undefined): void => {
  const RealDateTimeFormat = Intl.DateTimeFormat;
  vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
    locales?: string | string[],
    options?: Intl.DateTimeFormatOptions,
  ) {
    if (options?.timeZone === 'Not/AZone') throw new RangeError('Invalid time zone');
    const real = new RealDateTimeFormat(locales, options);
    return { resolvedOptions: () => ({ ...real.resolvedOptions(), timeZone }) };
  } as unknown as typeof Intl.DateTimeFormat);
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getClientTimeZone', () => {
  it('returns the browser IANA time zone', () => {
    mockResolvedTimeZone('Europe/Warsaw');
    expect(getClientTimeZone()).toBe('Europe/Warsaw');
  });

  it('returns undefined when the browser reports no time zone', () => {
    mockResolvedTimeZone(undefined);
    expect(getClientTimeZone()).toBeUndefined();
  });

  it('returns undefined when Intl rejects the reported time zone', () => {
    mockResolvedTimeZone('Not/AZone');
    expect(getClientTimeZone()).toBeUndefined();
  });

  it('returns undefined when Intl throws', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('unsupported');
    });
    expect(getClientTimeZone()).toBeUndefined();
  });
});
