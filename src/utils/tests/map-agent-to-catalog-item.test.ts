import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it } from 'vitest';

import type { DialModel } from '@/types/dial-entities';
import { DialAppTransportType } from '@/types/quick-apps';
import { ResourceScope } from '@/types/resource-scope';
import {
  canConfigureAgentTransport,
  getAgentOverviewRows,
  mapAgentToCatalogItem,
} from '@/utils/map-agent-to-catalog-item';

const SCOPE_LABELS = {
  [ResourceScope.Personal]: 'Personal',
  [ResourceScope.Shared]: 'Shared',
  [ResourceScope.Organization]: 'Organization',
};

const OPTIONS = { language: 'en', userBucket: 'user-bucket', scopeLabels: SCOPE_LABELS };

const LABELS = {
  folder: 'Folder',
  updated: 'Updated',
  version: 'Version',
  connection: 'Connection',
  mcp: 'MCP',
  chatCompletion: 'Chat completion',
};

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

describe('getAgentOverviewRows', () => {
  it('lists folder, version and the saved connection of an MCP-capable application', () => {
    const rows = getAgentOverviewRows(makeAgent({ mcp: true, version: '2.1' }), {
      ...OPTIONS,
      transport: DialAppTransportType.ChatCompletion,
      labels: LABELS,
    });

    expect(rows).toEqual([
      { label: 'Folder', value: 'Organization' },
      { label: 'Version', value: '2.1' },
      { label: 'Connection', value: 'Chat completion' },
    ]);
  });

  it('reads an unset transport as MCP and omits it for auto', () => {
    const agent = makeAgent({ mcp: true });

    expect(getAgentOverviewRows(agent, { ...OPTIONS, labels: LABELS }).at(-1)).toEqual({
      label: 'Connection',
      value: 'MCP',
    });
    expect(
      getAgentOverviewRows(agent, {
        ...OPTIONS,
        transport: DialAppTransportType.Auto,
        labels: LABELS,
      }).map((row) => row.label),
    ).toEqual(['Folder']);
  });

  it('has no connection row for a model', () => {
    const rows = getAgentOverviewRows(makeAgent({ id: 'gpt-4o', type: 'model', mcp: true }), {
      ...OPTIONS,
      labels: LABELS,
    });

    expect(rows.map((row) => row.label)).toEqual(['Folder']);
  });
});
