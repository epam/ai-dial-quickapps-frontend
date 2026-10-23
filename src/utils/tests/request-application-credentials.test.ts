import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestApplicationCredentials } from '@/utils/request-application-credentials';

const APP_ID = 'applications/public/research-agent';
const CHAT = 'https://chat.example.com';
const ADMIN = 'https://admin.example.com';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requestApplicationCredentials', () => {
  it('preserves the unprefixed application request for each allowed host', () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});

    requestApplicationCredentials(APP_ID, [CHAT, ADMIN]);

    expect(postMessage.mock.calls).toEqual([
      [{ type: 'REQUEST_APPLICATION_CREDENTIALS', appId: APP_ID }, CHAT],
      [{ type: 'REQUEST_APPLICATION_CREDENTIALS', appId: APP_ID }, ADMIN],
    ]);
  });

  it('retains the wildcard target when allowed origins are omitted', () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});

    requestApplicationCredentials(APP_ID);

    expect(postMessage).toHaveBeenCalledExactlyOnceWith(
      { type: 'REQUEST_APPLICATION_CREDENTIALS', appId: APP_ID },
      '*',
    );
  });
});
