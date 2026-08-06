import { DialToolset, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';
import { ToolsetAuthResultPayload } from '@/types/editor-messages';

/**
 * Merges a successful TOOLSET_LOGIN_RESULT into a toolset's auth settings.
 * `credentials` may be absent (e.g. a failed refresh fetch on the host side);
 * `success: true` alone is authoritative for the "logged in" status.
 */
export const applyToolsetLoginResult = (
  toolset: DialToolset,
  payload: ToolsetAuthResultPayload,
): DialToolset => {
  const { credentials } = payload;

  return {
    ...toolset,
    authSettings: {
      authenticationType:
        (credentials?.authenticationType as ToolsetAuthType | undefined) ??
        toolset.authSettings?.authenticationType ??
        ToolsetAuthType.OAuth,
      authStatus:
        (credentials?.userStatus as ToolsetAuthStatus | undefined) ??
        (credentials?.globalStatus as ToolsetAuthStatus | undefined) ??
        ToolsetAuthStatus.SignedIn,
      apiKeyHeader: credentials?.apiKeyHeader ?? toolset.authSettings?.apiKeyHeader,
    },
  };
};
