import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DialApp } from '@/types/dial-entities';

import { saveDialApp } from '@/utils/dial-client';

const { updateApplication } = vi.hoisted(() => ({
  updateApplication: vi.fn(),
}));

vi.mock('@/utils/chat-api-client', () => ({
  applicationsApi: { updateApplication },
}));

const app: DialApp = {
  id: 'applications/bucket/qa-quickapp-version-check__1.0.0',
  name: 'qa-quickapp-version-check',
  _rawForSave: {
    displayName: 'qa-quickapp-version-check',
    description: 'Original description',
    displayVersion: '1.0.0',
  },
};

const getSentBody = () =>
  (updateApplication.mock.calls[0][0] as { updateApplicationBodyDto: Record<string, unknown> })
    .updateApplicationBodyDto;

describe('saveDialApp', () => {
  beforeEach(() => {
    updateApplication.mockReset();
    updateApplication.mockResolvedValue({});
  });

  it('sends the host-supplied display version as the application version', async () => {
    await saveDialApp(
      app,
      {},
      {
        name: 'qa-quickapp-version-check',
        description: 'Edited in the editor',
        display_version: '1.0.1',
      },
    );

    expect(getSentBody()).toMatchObject({
      description: 'Edited in the editor',
      version: '1.0.1',
    });
  });

  it('does not send a version when the save carries no general fields', async () => {
    await saveDialApp(app, {});

    expect(getSentBody().version).toBeUndefined();
  });

  it.each([
    ['missing', undefined],
    ['blank', '   '],
  ])('does not send a version when the display version is %s', async (_label, displayVersion) => {
    await saveDialApp(
      app,
      {},
      {
        name: 'qa-quickapp-version-check',
        description: 'Edited in the editor',
        display_version: displayVersion,
      },
    );

    const body = getSentBody();
    expect(body.version).toBeUndefined();
    expect(body).toMatchObject({ description: 'Edited in the editor' });
  });
});
