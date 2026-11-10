import { describe, expect, it } from 'vitest';

import {
  mapInlineToolsetToCatalogItem,
  mapInlineToolsetTools,
} from '@/utils/map-inline-toolset-to-catalog-item';

const tool = (name: unknown, parameters?: unknown, description?: string) => ({
  open_ai_tool: { type: 'function', function: { name, description, parameters } },
});

describe('mapInlineToolsetTools', () => {
  it('maps name, description and parameters, skipping const parameters', () => {
    const tools = mapInlineToolsetTools({
      tools: [
        tool(
          'weather',
          {
            properties: {
              latitude: { type: 'number' },
              note: {},
              format: { type: null, const: 'csv' },
            },
            required: ['latitude', 'format'],
          },
          'Current weather',
        ),
      ],
    });

    expect(tools).toEqual([
      {
        name: 'weather',
        description: 'Current weather',
        inputParams: [
          { name: 'latitude', type: 'number', isRequired: true },
          { name: 'note', type: 'string', isRequired: false },
        ],
      },
    ]);
  });

  it('skips tools without a function name and tolerates a malformed config', () => {
    expect(mapInlineToolsetTools({ tools: [tool(''), tool(undefined), 'x', {}] })).toEqual([]);
    expect(mapInlineToolsetTools(undefined)).toEqual([]);
    expect(mapInlineToolsetTools({ tools: 'nope' })).toEqual([]);
  });
});

describe('mapInlineToolsetToCatalogItem', () => {
  it('returns an item whose details hold the tools', () => {
    const item = mapInlineToolsetToCatalogItem('Weather', { tools: [tool('weather')] });
    expect(item?.name).toBe('Weather');
    expect(item?.details?.tools?.tools).toHaveLength(1);
  });

  it('returns undefined when there is nothing to show', () => {
    expect(mapInlineToolsetToCatalogItem('Empty', { tools: [] })).toBeUndefined();
  });
});
