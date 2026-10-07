import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isNotFoundError, userConfigApi } from '@/utils/chat-api-client';
import { fetchFavoriteIds } from '@/utils/user-config';

vi.mock('@/utils/chat-api-client', () => ({
  isNotFoundError: vi.fn(),
  userConfigApi: { getUserConfig: vi.fn() },
}));

const getUserConfig = vi.mocked(userConfigApi.getUserConfig);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('fetchFavoriteIds', () => {
  it('merges installed deployments, toolsets and skills', async () => {
    getUserConfig.mockResolvedValue({
      version: 1,
      deployments: { installed: ['models/a'] },
      toolsets: { installed: ['toolsets/b'] },
      skills: { installed: ['skills/c', 'models/a'] },
    } as Awaited<ReturnType<typeof userConfigApi.getUserConfig>>);

    await expect(fetchFavoriteIds()).resolves.toEqual(
      new Set(['models/a', 'toolsets/b', 'skills/c']),
    );
  });

  it('treats missing sections as empty', async () => {
    getUserConfig.mockResolvedValue({} as Awaited<ReturnType<typeof userConfigApi.getUserConfig>>);

    await expect(fetchFavoriteIds()).resolves.toEqual(new Set());
  });

  it('returns no favorites when the user has no config yet (404)', async () => {
    getUserConfig.mockRejectedValue(new Error('not found'));
    vi.mocked(isNotFoundError).mockReturnValue(true);

    await expect(fetchFavoriteIds()).resolves.toEqual(new Set());
  });

  it('rethrows other errors', async () => {
    getUserConfig.mockRejectedValue(new Error('boom'));
    vi.mocked(isNotFoundError).mockReturnValue(false);

    await expect(fetchFavoriteIds()).rejects.toThrow('boom');
  });
});
