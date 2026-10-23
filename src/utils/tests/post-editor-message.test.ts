import { afterEach, describe, expect, it, vi } from 'vitest';

import { OutboundMessageType, type EditorOutboundMessage } from '@/types/editor-messages';
import { postEditorMessage } from '@/utils/post-editor-message';

const HOST = 'https://chat.example.com';
const ADMIN = 'https://admin.example.com';

describe('postEditorMessage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('preserves Admin and shared message envelopes with one delivery per target', () => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    const messages: EditorOutboundMessage[] = [
      { type: OutboundMessageType.Ready },
      { type: OutboundMessageType.HeightChange, payload: { height: 320 } },
      { type: OutboundMessageType.AutoSaveComplete },
      {
        type: OutboundMessageType.SaveSuccess,
        payload: { updatedApp: { id: 'app' } },
        hasChanges: true,
      },
      { type: OutboundMessageType.SaveError, payload: { error: 'Save failed' } },
      { type: OutboundMessageType.DirtyState, payload: { isDirty: true } },
      { type: OutboundMessageType.ValidityState, payload: { isValid: false } },
      { type: OutboundMessageType.RequestApplicationCredentials, appId: 'applications/b/app' },
      { type: OutboundMessageType.RequestToolsetLogin, toolsetId: 'toolsets/b/tool' },
      { type: OutboundMessageType.RequestToolsetLogout, toolsetId: 'toolsets/b/tool' },
    ];
    for (const message of messages) postEditorMessage(message, [HOST, ADMIN]);
    expect(postMessage.mock.calls).toEqual(
      messages.flatMap((message) => [
        [message, HOST],
        [message, ADMIN],
      ]),
    );
  });

  it.each([undefined, [], ['*'], [HOST, '*']])('preserves wildcard configuration %j', (origins) => {
    const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
    const message = { type: OutboundMessageType.DirtyState, payload: { isDirty: false } } as const;
    postEditorMessage(message, origins);
    expect(postMessage).toHaveBeenCalledExactlyOnceWith(message, '*');
  });
});
