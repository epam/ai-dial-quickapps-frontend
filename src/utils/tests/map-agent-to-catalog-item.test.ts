import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it } from 'vitest';

import { DialEntityType } from '@/types/dial-entities';
import type { DialModel } from '@/types/dial-entities';
import { ResourceScope } from '@/types/resource-scope';
import { canChooseAgentTransport, mapAgentToCatalogItem } from '@/utils/map-agent-to-catalog-item';

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
  type: DialEntityType.Application,
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
      mapAgentToCatalogItem(
        makeAgent({ id: 'gpt-4o', type: DialEntityType.Model, name: 'GPT-4o' }),
        OPTIONS,
      ),
    ).toMatchObject({ type: CatalogEntityType.Model, folder: ['Organization'] });
  });

  it('flags MCP agents, so Connect shows their MCP endpoint', () => {
    expect(mapAgentToCatalogItem(makeAgent({ mcp: true }), OPTIONS).supportsMcp).toBe(true);
    expect(mapAgentToCatalogItem(makeAgent({ features: { mcp: true } }), OPTIONS).supportsMcp).toBe(
      true,
    );
    expect(mapAgentToCatalogItem(makeAgent(), OPTIONS).supportsMcp).toBe(false);
  });
});

describe('canChooseAgentTransport', () => {
  const mcpApp = makeAgent({ mcp: true });

  it('is true for an MCP application that also serves chat completion', () => {
    expect(canChooseAgentTransport(mcpApp, { [mcpApp.id]: mcpApp })).toBe(true);
  });

  it('is false for an MCP-only application', () => {
    expect(canChooseAgentTransport(mcpApp, {})).toBe(false);
  });

  it('is false for an application without MCP', () => {
    const app = makeAgent();
    expect(canChooseAgentTransport(app, { [app.id]: app })).toBe(false);
  });

  it('is false for a model', () => {
    const model = makeAgent({ id: 'gpt-4o', type: DialEntityType.Model, mcp: true });
    expect(canChooseAgentTransport(model, { [model.id]: model })).toBe(false);
  });

  it('is false without an agent', () => {
    expect(canChooseAgentTransport(undefined, { [mcpApp.id]: mcpApp })).toBe(false);
  });
});
