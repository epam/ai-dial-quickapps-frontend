import { CredentialStatus, ToolsetAuthenticationType } from '@epam/ai-dial-catalog/mapping';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it } from 'vitest';

import { type DialToolset, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';
import { ResourceScope } from '@/types/resource-scope';
import {
  mapToolsetCredentials,
  mapToolsetToCatalogItem,
} from '@/utils/map-toolset-to-catalog-item';

const SCOPE_LABELS = {
  [ResourceScope.Personal]: 'Personal',
  [ResourceScope.Shared]: 'Shared',
  [ResourceScope.Organization]: 'Organization',
};

const OPTIONS = { language: 'en', userBucket: 'user-bucket', scopeLabels: SCOPE_LABELS };

const makeToolset = (overrides: Partial<DialToolset> = {}): DialToolset => ({
  id: 'toolsets/public/figma',
  reference: 'toolsets/public/figma',
  name: 'Figma',
  type: 'toolset',
  ...overrides,
});

describe('mapToolsetToCatalogItem', () => {
  it('maps a public toolset to an Organization row of the Toolset type', () => {
    const item = mapToolsetToCatalogItem(
      makeToolset({ version: '1.0.0', topics: ['Design'], description: 'Design files' }),
      OPTIONS,
    );

    expect(item).toMatchObject({
      id: 'toolsets/public/figma',
      type: CatalogEntityType.Toolset,
      name: 'Figma',
      version: '1.0.0',
      description: 'Design files',
      topics: ['Design'],
      folder: ['Organization'],
      isMyApp: false,
    });
  });

  it('marks a toolset in the user bucket as the user’s own and keeps its folders', () => {
    const item = mapToolsetToCatalogItem(
      makeToolset({ id: 'toolsets/user-bucket/team/jira' }),
      OPTIONS,
    );

    expect(item).toMatchObject({ folder: ['Personal', 'team'], isMyApp: true });
  });
});

describe('mapToolsetCredentials', () => {
  it('reports a signed-out OAuth public toolset at the user level', () => {
    expect(
      mapToolsetCredentials(
        makeToolset({
          authSettings: {
            authenticationType: ToolsetAuthType.OAuth,
            authStatus: ToolsetAuthStatus.SignedOut,
          },
        }),
      ),
    ).toEqual({
      authenticationType: ToolsetAuthenticationType.OAuth,
      isPublic: true,
      userStatus: CredentialStatus.SignedOut,
      apiKeyHeader: undefined,
    });
  });

  it('reports a signed-in API-key private toolset at the global level', () => {
    expect(
      mapToolsetCredentials(
        makeToolset({
          id: 'toolsets/user-bucket/jira',
          authSettings: {
            authenticationType: ToolsetAuthType.ApiKey,
            authStatus: ToolsetAuthStatus.SignedIn,
            apiKeyHeader: 'X-Key',
          },
        }),
      ),
    ).toEqual({
      authenticationType: ToolsetAuthenticationType.ApiKey,
      isPublic: false,
      globalStatus: CredentialStatus.SignedIn,
      apiKeyHeader: 'X-Key',
    });
  });

  it('treats a missing status as signed out', () => {
    expect(
      mapToolsetCredentials(
        makeToolset({ authSettings: { authenticationType: ToolsetAuthType.OAuth } }),
      )?.userStatus,
    ).toBe(CredentialStatus.SignedOut);
  });

  it('is undefined when no authentication is needed', () => {
    expect(mapToolsetCredentials(makeToolset())).toBeUndefined();
    expect(
      mapToolsetCredentials(
        makeToolset({ authSettings: { authenticationType: ToolsetAuthType.None } }),
      ),
    ).toBeUndefined();
  });
});

