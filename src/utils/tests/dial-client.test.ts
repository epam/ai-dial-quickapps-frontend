import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DialSkill } from '@/types/dial-entities';

import { fetchSkillManifest, fetchToolsetToolNames, mapCoreToDialSkill } from '../dial-client';

const { downloadSkillFile, getDeploymentDetails } = vi.hoisted(() => ({
  downloadSkillFile: vi.fn(),
  getDeploymentDetails: vi.fn(),
}));

vi.mock('@/utils/chat-api-client', () => ({
  skillsApi: { downloadSkillFile },
  deploymentsApi: { getDeploymentDetails },
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

describe('fetchToolsetToolNames', () => {
  beforeEach(() => {
    getDeploymentDetails.mockReset();
  });

  it('requests the details by the canonical (encoded) toolset id', async () => {
    getDeploymentDetails.mockResolvedValue({ id: 'x', type: 'toolset', toolsetDetails: {} });
    const signal = new AbortController().signal;

    await fetchToolsetToolNames('toolsets/public/my tools', signal);

    expect(getDeploymentDetails).toHaveBeenCalledWith(
      { deployment: 'toolsets/public/my%20tools' },
      { signal },
    );
  });

  it('returns every tool the server reports when there is no allow-list', async () => {
    getDeploymentDetails.mockResolvedValue({
      id: 'x',
      type: 'toolset',
      toolsetDetails: { allowedTools: [], allToolNames: ['a', 'b'] },
    });

    await expect(fetchToolsetToolNames('toolsets/public/figma')).resolves.toEqual(['a', 'b']);
  });

  it('returns the allow-list when the toolset restricts its tools', async () => {
    getDeploymentDetails.mockResolvedValue({
      id: 'x',
      type: 'toolset',
      toolsetDetails: { allowedTools: ['b'], allToolNames: ['a', 'b'] },
    });

    await expect(fetchToolsetToolNames('toolsets/public/figma')).resolves.toEqual(['b']);
  });

  it('returns no names when the details carry none', async () => {
    getDeploymentDetails.mockResolvedValue({ id: 'x', type: 'toolset' });

    await expect(fetchToolsetToolNames('toolsets/public/figma')).resolves.toEqual([]);
  });
});
