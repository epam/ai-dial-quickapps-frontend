import { describe, expect, it } from 'vitest';

import { getAddOnsFormValue } from '@/form/quick-app-form-data';
import { AddOnKind, AddOnResolution } from '@/types/add-on-kind';
import { AddOnSchemaKeys } from '@/types/quick-app-form';
import type { AnyToolset } from '@/types/quick-apps';
import { getAddOnKind, getAddOnResolution } from '@/utils/get-add-on-kind';
import { mapInlineToolsetToCatalogItem } from '@/utils/map-inline-toolset-to-catalog-item';

// The `tool_sets` of the app from issue #320, as saved by the JSON editor.
const TOOL_SETS = [
  { name: 'dial-deployment-tool-set', type: 'dial-deployment', tools: [] },
  {
    type: 'rest-api',
    authorization: null,
    name: 'Weather rest-api toolset',
    tools: [
      {
        rest_api_method_info: {
          method_url: 'https://api.open-meteo.com/v1/forecast',
          method_type: 'get',
        },
        display: { stage: { name: 'Search weather forecast' } },
        open_ai_tool: {
          type: 'function',
          function: {
            name: 'weather',
            description: 'To get current weather for geo coordinates (lat, lon)',
            parameters: {
              type: 'object',
              properties: {
                latitude: { type: 'number', parameter_info: { type: 'query', key: 'latitude' } },
                longitude: { type: 'number', parameter_info: { type: 'query', key: 'longitude' } },
                current: { type: null, const: 'temperature_2m' },
                format: { type: null, const: 'csv' },
              },
              required: ['latitude', 'longitude', 'current', 'format'],
            },
          },
        },
      },
    ],
  },
] as unknown as AnyToolset[];

describe('REST API toolset from issue #320', () => {
  const entries = getAddOnsFormValue(TOOL_SETS);

  it('loads as one name-keyed Toolsets-row entry that carries its config', () => {
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    expect(entry[AddOnSchemaKeys.id]).toBe('Weather rest-api toolset');
    expect(entry[AddOnSchemaKeys.tool]).toMatchObject({ type: 'rest-api' });
    expect(getAddOnKind(entry, {})).toBe(AddOnKind.Toolset);
  });

  it('resolves as Inline, not NotFound', () => {
    expect(getAddOnResolution(undefined, entries[0][AddOnSchemaKeys.id])).toBe(
      AddOnResolution.Inline,
    );
  });

  it('shows the weather tool with only the parameters the model chooses', () => {
    const item = mapInlineToolsetToCatalogItem(
      entries[0][AddOnSchemaKeys.id],
      entries[0][AddOnSchemaKeys.tool],
    );
    expect(item?.details?.tools?.tools).toEqual([
      {
        name: 'weather',
        description: 'To get current weather for geo coordinates (lat, lon)',
        inputParams: [
          { name: 'latitude', type: 'number', isRequired: true },
          { name: 'longitude', type: 'number', isRequired: true },
        ],
      },
    ]);
  });
});
