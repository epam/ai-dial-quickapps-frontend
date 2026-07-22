/** Raw wire shape of `.client_data/.user-config.json`. */
export interface UserConfigDto {
  version?: number;
  deployments?: { installed?: string[] };
  toolsets?: { installed?: string[] };
  [key: string]: unknown;
}

/** Normalized, always-current-version shape handed to callers. This app only reads this file. */
export interface UserConfig {
  version: number;
  deployments: { installed: string[] };
  toolsets: { installed: string[] };
  raw: UserConfigDto;
}
