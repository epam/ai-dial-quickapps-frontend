import { AppsEditorMessages } from '@epam/ai-dial-visualizer-connector';
import { describe, expect, it } from 'vitest';

import { readHostEditorMessage } from '@/utils/read-host-editor-message';

const HOST = 'https://chat.example.com';
const ADMIN = 'https://admin.example.com';
const messageEvent = (data: unknown, origin = HOST, source: Window | null = window.parent) =>
  new MessageEvent('message', { data, origin, source });

describe('readHostEditorMessage', () => {
  it('accepts preview saves and validates translated General fields', () => {
    expect(readHostEditorMessage(messageEvent({ type: 'TRIGGER_SAVE' }), [HOST])).toEqual({
      type: AppsEditorMessages.TriggerSave,
    });
    const general = {
      name: 'Assistant',
      description: 'Helps the team',
      primaryLocale: 'en',
      locales: [{ language: 'fr', name: 'Assistant', description: 'Aide' }],
      topics: ['support'],
      iconUrl: '/icon.svg',
      display_version: '1.0.1',
    };
    expect(readHostEditorMessage(messageEvent({ type: 'TRIGGER_SAVE', general }), [HOST])).toEqual({
      type: AppsEditorMessages.TriggerSave,
      general,
    });
  });

  it.each([
    null,
    [],
    'general',
    {},
    { name: 1 },
    { name: 'App', description: 1 },
    { name: 'App', topics: [1] },
    { name: 'App', locales: [{}] },
    { name: 'App', locales: [{ language: 'fr', name: 1 }] },
    { name: 'App', primaryLocale: false },
    { name: 'App', iconUrl: 1 },
    { name: 'App', display_version: 1 },
  ])('rejects malformed General values %j', (general) => {
    expect(
      readHostEditorMessage(messageEvent({ type: 'TRIGGER_SAVE', general }), [HOST]),
    ).toBeNull();
  });

  it('retains Admin reset and autosave commands', () => {
    for (const data of [
      { type: 'RESET' },
      { type: 'TRIGGER_AUTO_SAVE' },
      { type: 'TRIGGER_AUTO_SAVE', payload: { ignoreDirty: true } },
      { type: 'TRIGGER_AUTO_SAVE', payload: { ignoreDirty: false } },
    ]) {
      expect(readHostEditorMessage(messageEvent(data), [HOST])).toEqual(data);
    }
  });

  it.each([null, [], true, 'payload', { ignoreDirty: 'true' }, { ignoreDirty: 1 }])(
    'rejects malformed autosave payload %j',
    (payload) => {
      expect(
        readHostEditorMessage(messageEvent({ type: 'TRIGGER_AUTO_SAVE', payload }), [HOST]),
      ).toBeNull();
    },
  );

  it('accepts login/logout results and narrows credential metadata', () => {
    for (const type of ['TOOLSET_LOGIN_RESULT', 'TOOLSET_LOGOUT_RESULT']) {
      const data = {
        type,
        toolsetId: 'toolsets/public/tool',
        success: true,
        credentialsLevel: 'USER',
        credentials: {
          authenticationType: 'OAUTH',
          userStatus: 'SIGNED_IN',
          globalStatus: 'SIGNED_OUT',
          isPublic: true,
          isManageableByAdmin: false,
          apiKeyHeader: 'X-Api-Key',
        },
      };
      expect(readHostEditorMessage(messageEvent(data), [HOST])).toEqual(data);
    }
    const failure = {
      type: 'TOOLSET_LOGIN_RESULT',
      toolsetId: 'toolsets/public/tool',
      success: false,
      reason: 'access_denied',
    };
    expect(readHostEditorMessage(messageEvent(failure), [HOST])).toEqual(failure);
  });

  it.each([
    { success: 'true' },
    { success: undefined },
    { toolsetId: '' },
    { toolsetId: 1 },
    { credentialsLevel: 'INVALID' },
    { reason: 1 },
    { credentials: null },
    { credentials: [] },
    { credentials: {} },
    { credentials: { authenticationType: 'INVALID' } },
    { credentials: { authenticationType: 'OAUTH', userStatus: 'INVALID' } },
    { credentials: { authenticationType: 'OAUTH', globalStatus: 'INVALID' } },
    { credentials: { authenticationType: 'OAUTH', isPublic: 'true' } },
    { credentials: { authenticationType: 'OAUTH', isManageableByAdmin: 1 } },
    { credentials: { authenticationType: 'OAUTH', apiKeyHeader: false } },
  ])('rejects malformed auth result fields %j', (overrides) => {
    expect(
      readHostEditorMessage(
        messageEvent({
          type: 'TOOLSET_LOGIN_RESULT',
          toolsetId: 'toolsets/public/tool',
          success: true,
          ...overrides,
        }),
        [HOST],
      ),
    ).toBeNull();
  });

  it('allows additional fields without treating them as trusted domain data', () => {
    expect(
      readHostEditorMessage(
        messageEvent({
          type: 'TRIGGER_SAVE',
          extra: 'ignored',
          general: { name: 'App', extra: 'ignored' },
        }),
        [HOST],
      ),
    ).toEqual({ type: AppsEditorMessages.TriggerSave, general: { name: 'App' } });
  });

  it('retains multiple-origin and wildcard policies for parent messages', () => {
    const data = { type: 'RESET' };
    expect(readHostEditorMessage(messageEvent(data, ADMIN), [HOST, ADMIN])).toEqual(data);
    expect(readHostEditorMessage(messageEvent(data, ADMIN), [HOST])).toBeNull();
    for (const origins of [undefined, [], ['*'], [HOST, '*']]) {
      expect(readHostEditorMessage(messageEvent(data, ADMIN), origins)).toEqual(data);
    }
  });

  it('rejects non-parent senders even with an allowed origin or wildcard', () => {
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    try {
      for (const origins of [undefined, [], ['*'], [HOST]]) {
        for (const source of [null, iframe.contentWindow]) {
          expect(
            readHostEditorMessage(messageEvent({ type: 'RESET' }, HOST, source), origins),
          ).toBeNull();
        }
      }
    } finally {
      iframe.remove();
    }
  });

  it.each([
    null,
    [],
    1,
    'TRIGGER_SAVE',
    {},
    { type: 'UNKNOWN' },
    { type: 'SAVE_SUCCESS' },
    { type: 'X/READY' },
    { type: 'X/readyToSave' },
  ])('ignores unknown/wrong-direction data %j', (data) => {
    expect(readHostEditorMessage(messageEvent(data), [HOST])).toBeNull();
  });
});
