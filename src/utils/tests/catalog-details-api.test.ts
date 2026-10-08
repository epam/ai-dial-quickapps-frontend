import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCatalogDetailsApi } from '@/utils/catalog-details-api';

const { deploymentsApi, skillsApi } = vi.hoisted(() => ({
  deploymentsApi: { getDeploymentDetails: vi.fn(), getDeploymentLimits: vi.fn() },
  skillsApi: { downloadSkillFileRaw: vi.fn(), listSkillFiles: vi.fn(), getSkillMetadata: vi.fn() },
}));

vi.mock('@/utils/chat-api-client', () => ({ deploymentsApi, skillsApi }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createCatalogDetailsApi', () => {
  const api = createCatalogDetailsApi();

  it('re-encodes deployment ids for the details and limits requests', async () => {
    deploymentsApi.getDeploymentDetails.mockResolvedValue({ id: 'x' });
    deploymentsApi.getDeploymentLimits.mockResolvedValue({ stats: [] });

    await expect(api.getDeploymentDetails('toolsets/public/my tools')).resolves.toEqual({
      id: 'x',
    });
    await api.getDeploymentLimits('gpt 4o');

    expect(deploymentsApi.getDeploymentDetails).toHaveBeenCalledWith({
      deployment: 'toolsets/public/my%20tools',
    });
    expect(deploymentsApi.getDeploymentLimits).toHaveBeenCalledWith({ deployment: 'gpt%204o' });
  });

  it('returns the raw response of a skill file download', async () => {
    const raw = new Response('# Skill');
    const signal = new AbortController().signal;
    skillsApi.downloadSkillFileRaw.mockResolvedValue({ raw });

    await expect(api.downloadSkillFile('public', 'research', 'SKILL.md', signal)).resolves.toBe(
      raw,
    );
    expect(skillsApi.downloadSkillFileRaw).toHaveBeenCalledWith(
      { bucket: 'public', path: 'research', filePath: 'SKILL.md' },
      { signal },
    );
  });

  it('passes skill listing and metadata requests through', async () => {
    const params = { bucket: 'public', path: 'research', filePath: '', recursive: true };
    skillsApi.listSkillFiles.mockResolvedValue({ items: [] });
    skillsApi.getSkillMetadata.mockResolvedValue({ name: 'research' });

    await api.listSkillFiles(params);
    await api.getSkillMetadata('public', 'research');

    expect(skillsApi.listSkillFiles).toHaveBeenCalledWith(params, { signal: undefined });
    expect(skillsApi.getSkillMetadata).toHaveBeenCalledWith(
      { bucket: 'public', path: 'research' },
      { signal: undefined },
    );
  });

  it('rejects prompt requests, which the editor never makes', async () => {
    await expect(api.getPrompt('prompts/u/p')).rejects.toThrow();
    await expect(api.getPublicPrompt('p')).rejects.toThrow();
  });
});
