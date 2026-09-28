import {
  DialToolset,
  ToolsetAuthStatus,
  ToolsetAuthType,
  ToolsetCredentialsLevel,
} from '@/types/dial-entities';
import { ToolsetAuthResultPayload } from '@/types/editor-messages';
import { isPublicToolsetId } from '@/utils/api';

/**
 * Merges a successful TOOLSET_LOGIN_RESULT/TOOLSET_LOGOUT_RESULT into a
 * toolset's auth settings. `credentials` may be absent (e.g. a failed
 * refresh fetch on the host side); `fallbackStatus` covers that case —
 * pass `ToolsetAuthStatus.SignedIn` for a login result, `SignedOut` for a
 * logout result.
 *
 * Public toolsets are signed in per-user, private ones per-workspace, so the
 * relevant status field must be picked by level.
 */
export const applyToolsetAuthResult = (
  toolset: DialToolset,
  payload: ToolsetAuthResultPayload,
  fallbackStatus: ToolsetAuthStatus,
): DialToolset => {
  const { credentials } = payload;
  const credentialsLevel =
    payload.credentialsLevel ??
    (isPublicToolsetId(toolset.id) ? ToolsetCredentialsLevel.User : ToolsetCredentialsLevel.Global);
  const levelStatus =
    credentialsLevel === ToolsetCredentialsLevel.User
      ? credentials?.userStatus
      : credentials?.globalStatus;

  return {
    ...toolset,
    authSettings: {
      authenticationType:
        (credentials?.authenticationType as ToolsetAuthType | undefined) ??
        toolset.authSettings?.authenticationType ??
        ToolsetAuthType.OAuth,
      authStatus: (levelStatus as ToolsetAuthStatus | undefined) ?? fallbackStatus,
      apiKeyHeader: credentials?.apiKeyHeader ?? toolset.authSettings?.apiKeyHeader,
    },
  };
};
