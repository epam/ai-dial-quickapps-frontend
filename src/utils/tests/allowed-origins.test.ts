import { afterEach, describe, expect, it, vi } from 'vitest';

import { isOriginAllowed, parseAllowedOrigins, postToHost } from '@/utils/allowed-origins';

const CHAT = 'https://chat.example.com';
const ADMIN = 'https://admin.example.com';

describe('parseAllowedOrigins', () => {
  it.each([
    [undefined, []],
    ['', []],
    [42, []],
    [CHAT, [CHAT]],
    ['*', ['*']],
    [`${CHAT}, ${ADMIN}`, [CHAT, ADMIN]],
    [`${CHAT} ${ADMIN}/`, [CHAT, ADMIN]],
    [
      [CHAT, ` ${ADMIN} `, 1, ''],
      [CHAT, ADMIN],
    ],
  ])('parses %j into %j', (value, expected) => {
    expect(parseAllowedOrigins(value)).toEqual(expected);
  });
});

describe('isOriginAllowed', () => {
  it('accepts any origin when nothing is configured or the wildcard is listed', () => {
    expect(isOriginAllowed(CHAT, undefined)).toBe(true);
    expect(isOriginAllowed(CHAT, [])).toBe(true);
    expect(isOriginAllowed('https://evil.example.com', [ADMIN, '*'])).toBe(true);
  });

  it('accepts only listed origins otherwise', () => {
    expect(isOriginAllowed(CHAT, [CHAT, ADMIN])).toBe(true);
    expect(isOriginAllowed(ADMIN, [CHAT, ADMIN])).toBe(true);
    expect(isOriginAllowed('https://evil.example.com', [CHAT, ADMIN])).toBe(false);
  });
});

describe('postToHost', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts once with the wildcard when nothing is configured', () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    postToHost({ type: 'READY' }, []);
    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: 'READY' }, '*');
  });

  it('posts once per configured origin', () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    postToHost({ type: 'READY' }, [CHAT, ADMIN]);
    expect(postMessage.mock.calls).toEqual([
      [{ type: 'READY' }, CHAT],
      [{ type: 'READY' }, ADMIN],
    ]);
  });

  it('keeps posting to the remaining origins when one entry is malformed', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const postMessage = vi
      .spyOn(window.parent, 'postMessage')
      .mockImplementationOnce(() => {
        throw new SyntaxError('Invalid target origin');
      })
      .mockImplementation(() => {});
    postToHost({ type: 'READY' }, ['chat.example.com', ADMIN]);
    expect(postMessage).toHaveBeenLastCalledWith({ type: 'READY' }, ADMIN);
  });
});
