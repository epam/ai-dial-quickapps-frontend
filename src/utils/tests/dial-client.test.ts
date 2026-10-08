import { describe, expect, it, vi } from 'vitest';

import { mapCoreToDialSkill } from '../dial-client';

vi.mock('@/utils/chat-api-client', () => ({ skillsApi: {}, deploymentsApi: {} }));

describe('mapCoreToDialSkill', () => {
  it('decodes the url into the id and keeps bucket and path', () => {
    const skill = mapCoreToDialSkill({
      url: 'skills/public/research/user%20research',
      name: 'User Research',
      bucket: 'public',
      path: 'research/user research',
    });

    expect(skill).toMatchObject({
      id: 'skills/public/research/user research',
      bucket: 'public',
      path: 'research/user research',
    });
    expect(skill).not.toHaveProperty('version');
    expect(skill).not.toHaveProperty('tags');
  });

  it('copies version and tags when the listing carries them', () => {
    const skill = mapCoreToDialSkill({
      url: 'skills/public/x',
      name: 'X',
      ...{ version: '1.4.6', tags: ['Business', 3] },
    });

    expect(skill).toMatchObject({ version: '1.4.6', tags: ['Business'] });
  });
});
