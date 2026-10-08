import { describe, expect, it } from 'vitest';

import {
  type DialToolset,
  ToolsetAuthStatus,
  ToolsetAuthType,
  ToolsetCredentialsLevel,
} from '@/types/dial-entities';
import { applyToolsetAuthResult } from '@/utils/apply-toolset-auth-result';

const toolset = (id: string, authSettings?: DialToolset['authSettings']): DialToolset => ({
  id,
  reference: id,
  name: 'T',
  type: 'toolset',
  authSettings,
});

const PUBLIC_ID = 'toolsets/public/search';
const PRIVATE_ID = 'toolsets/my-bucket/search';

describe('applyToolsetAuthResult', () => {
  it('reads the user-level status for a public toolset', () => {
    const result = applyToolsetAuthResult(
      toolset(PUBLIC_ID),
      {
        toolsetId: PUBLIC_ID,
        success: true,
        credentials: {
          authenticationType: ToolsetAuthType.ApiKey,
          userStatus: ToolsetAuthStatus.SignedIn,
          globalStatus: ToolsetAuthStatus.SignedOut,
          apiKeyHeader: 'X-Key',
        },
      },
      ToolsetAuthStatus.SignedOut,
    );

    expect(result.authSettings).toEqual({
      authenticationType: ToolsetAuthType.ApiKey,
      authStatus: ToolsetAuthStatus.SignedIn,
      apiKeyHeader: 'X-Key',
    });
  });

  it('reads the global status for a private toolset', () => {
    const result = applyToolsetAuthResult(
      toolset(PRIVATE_ID),
      {
        toolsetId: PRIVATE_ID,
        success: true,
        credentials: {
          authenticationType: ToolsetAuthType.OAuth,
          userStatus: ToolsetAuthStatus.SignedIn,
          globalStatus: ToolsetAuthStatus.SignedOut,
        },
      },
      ToolsetAuthStatus.SignedIn,
    );

    expect(result.authSettings?.authStatus).toBe(ToolsetAuthStatus.SignedOut);
  });

  it('lets an explicit credentials level override the id-based one', () => {
    const result = applyToolsetAuthResult(
      toolset(PRIVATE_ID),
      {
        toolsetId: PRIVATE_ID,
        success: true,
        credentialsLevel: ToolsetCredentialsLevel.User,
        credentials: {
          authenticationType: ToolsetAuthType.OAuth,
          userStatus: ToolsetAuthStatus.SignedIn,
        },
      },
      ToolsetAuthStatus.SignedOut,
    );

    expect(result.authSettings?.authStatus).toBe(ToolsetAuthStatus.SignedIn);
  });

  it('keeps existing settings and uses the fallback status without credentials', () => {
    const result = applyToolsetAuthResult(
      toolset(PRIVATE_ID, {
        authenticationType: ToolsetAuthType.ApiKey,
        authStatus: ToolsetAuthStatus.SignedIn,
        apiKeyHeader: 'X-Old',
      }),
      { toolsetId: PRIVATE_ID, success: true },
      ToolsetAuthStatus.SignedOut,
    );

    expect(result.authSettings).toEqual({
      authenticationType: ToolsetAuthType.ApiKey,
      authStatus: ToolsetAuthStatus.SignedOut,
      apiKeyHeader: 'X-Old',
    });
  });

  it('defaults to OAuth when nothing says otherwise', () => {
    const result = applyToolsetAuthResult(
      toolset(PRIVATE_ID),
      { toolsetId: PRIVATE_ID, success: true },
      ToolsetAuthStatus.SignedIn,
    );

    expect(result.authSettings?.authenticationType).toBe(ToolsetAuthType.OAuth);
  });
});
