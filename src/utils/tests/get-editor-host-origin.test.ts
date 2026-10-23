import { describe, expect, it } from 'vitest';

import { getEditorHostOrigin } from '@/utils/get-editor-host-origin';

const CHAT = 'https://chat.example.com';
const ADMIN = 'https://admin.example.com';

describe('getEditorHostOrigin', () => {
  it('prefers Chat when its normalized origin matches the immediate ancestor', () => {
    expect(getEditorHostOrigin({ dialAdminHost: ADMIN, dialChatHost: `${CHAT}/` }, CHAT)).toBe(
      CHAT,
    );
  });

  it.each([undefined, ADMIN, 'https://other.example.com'])(
    'keeps Admin first when the ancestor does not identify Chat: %s',
    (ancestor) => {
      expect(getEditorHostOrigin({ dialAdminHost: ADMIN, dialChatHost: CHAT }, ancestor)).toBe(
        ADMIN,
      );
    },
  );

  it('falls back to Chat when the Admin host is empty', () => {
    expect(getEditorHostOrigin({ dialAdminHost: '', dialChatHost: CHAT })).toBe(CHAT);
  });

  it('normalizes a configured URL to its exact origin', () => {
    expect(getEditorHostOrigin({ dialChatHost: `${CHAT}/path?query=1#fragment` })).toBe(CHAT);
  });

  it.each([undefined, '', '*', 'chat.example.com', 'data:text/plain,editor', 'file:///editor'])(
    'returns no host for missing, malformed, or opaque values: %s',
    (host) => {
      expect(getEditorHostOrigin({ dialAdminHost: host })).toBeNull();
    },
  );

  it('does not silently switch away from a malformed selected Admin host', () => {
    expect(getEditorHostOrigin({ dialAdminHost: 'invalid', dialChatHost: CHAT })).toBeNull();
  });
});
