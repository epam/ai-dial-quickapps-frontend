import type { UserConfig, UserConfigDto } from '@/types/user-config';
import { handleUnauthorizedResponse } from '@/utils/handle-unauthorized-response';
import { fetchDialBucket } from '@/utils/dialClient';

/** Per-user config file stored in the user's DIAL Core bucket. Read-only: this app never writes it. */
const USER_CONFIG_PATH = '.client_data/.user-config.json';

const CURRENT_USER_CONFIG_VERSION = 1;

const fetchUserConfigUrl = async (): Promise<string> => {
  const bucket = await fetchDialBucket();
  return `/api/dial/v1/files/${encodeURIComponent(bucket)}/${USER_CONFIG_PATH}`;
};

/**
 * The single place that knows about `config.version` and any legacy field
 * shapes. There is nothing to migrate yet, so this just stamps the current
 * version — it exists so a future format change has one seam to hook into
 * instead of every caller needing to know about old shapes.
 */
const migrateUserConfigDto = (dto: UserConfigDto): UserConfigDto => ({
  ...dto,
  version: dto.version ?? CURRENT_USER_CONFIG_VERSION,
});

const toUserConfig = (dto: UserConfigDto): UserConfig => {
  const migrated = migrateUserConfigDto(dto);
  return {
    version: migrated.version ?? CURRENT_USER_CONFIG_VERSION,
    deployments: { installed: migrated.deployments?.installed ?? [] },
    toolsets: { installed: migrated.toolsets?.installed ?? [] },
    raw: migrated,
  };
};

const emptyUserConfig = (): UserConfig => toUserConfig({ version: CURRENT_USER_CONFIG_VERSION });

/** Reads and normalizes the per-user config, migrating legacy shapes on the way. */
export const getUserConfig = async (): Promise<UserConfig> => {
  const url = await fetchUserConfigUrl();
  const res = await fetch(url);
  if (res.status === 404) return emptyUserConfig();
  if (!res.ok) {
    handleUnauthorizedResponse(res);
    const body = await res.text().catch(() => '');
    throw new Error(`DIAL API ${res.status} for GET /v1/files/.../${USER_CONFIG_PATH}: ${body}`);
  }
  const dto = (await res.json()) as UserConfigDto;
  return toUserConfig(dto);
};

/** Favorite ids: "installed" on the backend is "favorite" in the UI. */
export const fetchFavoriteIds = async (): Promise<Set<string>> => {
  const config = await getUserConfig();
  return new Set([...config.deployments.installed, ...config.toolsets.installed]);
};
