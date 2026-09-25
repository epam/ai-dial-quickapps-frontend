import type { UserConfigDto as GeneratedUserConfigDto } from '@epam/ai-dial-chat-api-client';

import type { UserConfig, UserConfigDto } from '@/types/user-config';
import { isNotFoundError, userConfigApi } from '@/utils/chat-api-client';

const CURRENT_USER_CONFIG_VERSION = 1;

const toUserConfig = (dto: GeneratedUserConfigDto): UserConfig => {
  const raw = dto as unknown as UserConfigDto;
  return {
    version: dto.version ?? CURRENT_USER_CONFIG_VERSION,
    deployments: { installed: dto.deployments?.installed ?? [] },
    toolsets: { installed: dto.toolsets?.installed ?? [] },
    skills: { installed: dto.skills?.installed ?? [] },
    raw,
  };
};

const emptyUserConfig = (): UserConfig =>
  toUserConfig({ version: CURRENT_USER_CONFIG_VERSION } as GeneratedUserConfigDto);

/** Reads and normalizes the per-user config — a native, session-scoped chat-api endpoint (no bucket lookup needed). */
export const getUserConfig = async (): Promise<UserConfig> => {
  try {
    const dto = await userConfigApi.getUserConfig();
    return toUserConfig(dto);
  } catch (error) {
    if (isNotFoundError(error)) return emptyUserConfig();
    throw error;
  }
};

/** Favorite ids: "installed" on the backend is "favorite" in the UI. */
export const fetchFavoriteIds = async (): Promise<Set<string>> => {
  const config = await getUserConfig();
  return new Set([
    ...config.deployments.installed,
    ...config.toolsets.installed,
    ...config.skills.installed,
  ]);
};
