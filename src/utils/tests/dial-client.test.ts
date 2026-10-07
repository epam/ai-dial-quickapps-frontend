import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DialSkill } from '@/types/dial-entities';

import { fetchSkillManifest, mapCoreToDialSkill } from '../dialClient';

const { downloadSkillFile } = vi.hoisted(() => ({ downloadSkillFile: vi.fn() }));

vi.mock('@/utils/chat-api-client', () => ({
  skillsApi: { downloadSkillFile },
}));

const makeSkill = (overrides: Partial<DialSkill> = {}): DialSkill => ({
  id: 'skills/public/research/user-research',
  reference: 'skills/public/research/user-research',
  name: 'User Research',
  type: 'skill',
  ...overrides,
});

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

describe('fetchSkillManifest', () => {
  beforeEach(() => {
    downloadSkillFile.mockReset();
    downloadSkillFile.mockResolvedValue(new Blob(['# Manifest']));
  });

  it('derives bucket and path from the id and returns the manifest text', async () => {
    const signal = new AbortController().signal;

    await expect(fetchSkillManifest(makeSkill(), signal)).resolves.toBe('# Manifest');
    expect(downloadSkillFile).toHaveBeenCalledWith(
      { bucket: 'public', path: 'research/user-research', filePath: 'SKILL.md' },
      { signal },
    );
  });

  it('prefers the bucket and path from the listing', async () => {
    await fetchSkillManifest(makeSkill({ bucket: 'b', path: 'p/q' }));

    expect(downloadSkillFile).toHaveBeenCalledWith(
      { bucket: 'b', path: 'p/q', filePath: 'SKILL.md' },
      { signal: undefined },
    );
  });
});
