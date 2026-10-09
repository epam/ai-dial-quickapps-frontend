import { describe, expect, it } from 'vitest';

import { DialEntityType } from '@/types/dial-entities';
import { AddOnSchemaKeys } from '@/types/quick-app-form';
import { AddOnKind } from '@/types/add-on-kind';
import type { DialModel, DialToolset } from '@/types/dial-entities';
import {
  type AddOnEntry,
  buildAddOnEntityMap,
  getAddOnKind,
  partitionAddOnIds,
} from '@/utils/get-add-on-kind';

const toolset = (id: string, name = id): DialToolset => ({
  id,
  reference: id,
  name,
  type: DialEntityType.Toolset,
});

const deployment = (id: string, type: DialModel['type']): DialModel => ({
  id,
  reference: id,
  name: id,
  type,
});

const entry = (id: string, extra: Partial<AddOnEntry> = {}): AddOnEntry => ({
  [AddOnSchemaKeys.id]: id,
  ...extra,
});

const FIGMA = toolset('toolsets/public/figma', 'Figma');
const RESEARCH = deployment('applications/public/research-agent', DialEntityType.Application);
const GPT = deployment('gpt-4o', DialEntityType.Model);
const MCP_AGENT = deployment('applications/public/mcp-agent', DialEntityType.Application);

const ENTITY_MAP = buildAddOnEntityMap([GPT, RESEARCH], [FIGMA], [MCP_AGENT], 'en');

describe('buildAddOnEntityMap', () => {
  it('indexes every entity by id and toolsets also by display name', () => {
    expect(ENTITY_MAP['toolsets/public/figma']).toBe(FIGMA);
    expect(ENTITY_MAP['Figma']).toBe(FIGMA);
    expect(ENTITY_MAP['gpt-4o']).toBe(GPT);
    expect(ENTITY_MAP['applications/public/mcp-agent']).toBe(MCP_AGENT);
  });

  it('lets an id win over a display name, and the first toolset win a name collision', () => {
    const first = toolset('toolsets/public/a', 'gpt-4o');
    const second = toolset('toolsets/public/b', 'Shared');
    const third = toolset('toolsets/public/c', 'Shared');

    const map = buildAddOnEntityMap([GPT], [first, second, third], [], 'en');

    expect(map['gpt-4o']).toBe(GPT);
    expect(map['Shared']).toBe(second);
  });
});

describe('getAddOnKind', () => {
  it.each<[string, AddOnEntry, AddOnKind]>([
    ['a toolset entity', entry('toolsets/public/figma'), AddOnKind.Toolset],
    ['a toolset matched by display name', entry('Figma'), AddOnKind.Toolset],
    ['an application', entry('applications/public/research-agent'), AddOnKind.Agent],
    ['an MCP agent', entry('applications/public/mcp-agent'), AddOnKind.Agent],
    ['a model', entry('gpt-4o'), AddOnKind.Agent],
    ['a toolset id missing from the catalog', entry('toolsets/public/old'), AddOnKind.Toolset],
    ['an application id missing from the catalog', entry('applications/u/old'), AddOnKind.Agent],
    [
      'an inline toolset config without a deployment id',
      entry('jira', { [AddOnSchemaKeys.tool]: { name: 'jira', type: 'dial-mcp' } }),
      AddOnKind.Toolset,
    ],
    [
      'a dial-deployment tool whose model is no longer listed',
      entry('old-model', {
        [AddOnSchemaKeys.tool]: { deployment_id: 'old-model' },
        [AddOnSchemaKeys.isDialDeploymentTool]: true,
      }),
      AddOnKind.Agent,
    ],
  ])('classifies %s', (_, value, expected) => {
    expect(getAddOnKind(value, ENTITY_MAP)).toBe(expected);
  });
});

describe('partitionAddOnIds', () => {
  it('splits the ids by row and keeps their order', () => {
    const entries = [
      entry('applications/public/research-agent'),
      entry('toolsets/public/figma'),
      entry('gpt-4o'),
      entry('toolsets/public/old'),
    ];

    expect(partitionAddOnIds(entries, ENTITY_MAP)).toEqual({
      toolsetIds: ['toolsets/public/figma', 'toolsets/public/old'],
      agentIds: ['applications/public/research-agent', 'gpt-4o'],
    });
  });
});
