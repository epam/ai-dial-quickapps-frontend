import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it } from 'vitest';

import type { DialModel } from '@/types/dial-entities';
import { ResourceScope } from '@/types/resource-scope';
import {
  canConfigureAgentTransport,
  mapAgentToCatalogItem,
} from '@/utils/map-agent-to-catalog-item';

const SCOPE_LABELS = {
  [ResourceScope.Personal]: 'Personal',
  [ResourceScope.Shared]: 'Shared',
  [ResourceScope.Organization]: 'Organization',
};

const OPTIONS = { language: 'en', userBucket: 'user-bucket', scopeLabels: SCOPE_LABELS };

const makeAgent = (overrides: Partial<DialModel> = {}): DialModel => ({
  id: 'applications/public/research-agent',
  reference: 'applications/public/research-agent',
  name: 'Research Agent',
  type: 'application',
  ...overrides,
});

describe('mapAgentToCatalogItem', () => {
  it('gives applications the Agent type', () => {
    expect(mapAgentToCatalogItem(makeAgent(), OPTIONS)).toMatchObject({
      type: CatalogEntityType.Agent,
      name: 'Research Agent',
      folder: ['Organization'],
    });
  });

  it('keeps the Model type for models', () => {
    expect(
      mapAgentToCatalogItem(makeAgent({ id: 'gpt-4o', type: 'model', name: 'GPT-4o' }), OPTIONS),
    ).toMatchObject({ type: CatalogEntityType.Model, folder: ['Organization'] });
  });
});

describe('canConfigureAgentTransport', () => {
  it('is true only for MCP-capable applications', () => {
    expect(canConfigureAgentTransport(makeAgent({ mcp: true }))).toBe(true);
    expect(canConfigureAgentTransport(makeAgent())).toBe(false);
    expect(canConfigureAgentTransport(makeAgent({ type: 'model', mcp: true }))).toBe(false);
    expect(canConfigureAgentTransport(undefined)).toBe(false);
  });
});

