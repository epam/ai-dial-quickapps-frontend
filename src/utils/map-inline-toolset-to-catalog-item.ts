import type { CatalogItem, ToolDefinition, ToolInputParam } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mapInputParams = (parameters: unknown): ToolInputParam[] => {
  if (!isObject(parameters) || !isObject(parameters.properties)) return [];
  const required = Array.isArray(parameters.required) ? parameters.required : [];

  return Object.entries(parameters.properties)
    .filter(([, schema]) => !(isObject(schema) && 'const' in schema))
    .map(([name, schema]) => ({
      name,
      type: isObject(schema) && typeof schema.type === 'string' ? schema.type : 'string',
      isRequired: required.includes(name),
    }));
};

const mapTool = (tool: unknown): ToolDefinition | undefined => {
  if (!isObject(tool) || !isObject(tool.open_ai_tool)) return undefined;
  const fn = tool.open_ai_tool.function;
  if (!isObject(fn) || typeof fn.name !== 'string' || fn.name === '') return undefined;

  return {
    name: fn.name,
    description: typeof fn.description === 'string' ? fn.description : undefined,
    inputParams: mapInputParams(fn.parameters),
  };
};

/**
 * The tools an inline toolset config declares (`tools[].open_ai_tool.function`),
 * in the catalog's Tools tab shape. Parameters fixed by the config (`const`)
 * are left out: the model does not choose them.
 */
export const mapInlineToolsetTools = (config?: JsonObject): ToolDefinition[] => {
  const tools = Array.isArray(config?.tools) ? config.tools : [];
  return tools.map(mapTool).filter((tool): tool is ToolDefinition => tool != null);
};

/**
 * An inline toolset as a catalog item whose details hold only its tools, or
 * undefined when the config declares none (nothing to show).
 */
export const mapInlineToolsetToCatalogItem = (
  name: string,
  config?: JsonObject,
): CatalogItem | undefined => {
  const tools = mapInlineToolsetTools(config);
  if (tools.length === 0) return undefined;

  return {
    id: name,
    type: CatalogEntityType.Toolset,
    name,
    version: '',
    description: '',
    topics: [],
    folder: [],
    lastUsed: '',
    details: { tools: { tools } },
  };
};
