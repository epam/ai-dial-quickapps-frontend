import {
  type AnyToolset,
  CodeInterpreterTemplate,
  type CodeInterpreterToolset,
  type DialAppToolset,
  type DialDeploymentSimpleTool,
  type DialDeploymentToolset,
  DialDeploymentToolsetToolTypes,
  type MCPToolset,
  ToolsetTypes,
  type UnknownToolset,
} from '@/types/quick-apps';

export const isDialDeploymentToolset = (toolset: AnyToolset): toolset is DialDeploymentToolset =>
  toolset.type === ToolsetTypes.DialDeployment;

export const isDialDeploymentSimpleTool = (tool: {
  type?: unknown;
}): tool is DialDeploymentSimpleTool =>
  tool.type === DialDeploymentToolsetToolTypes.DialDeploymentSimple;

export const isMcpToolset = (toolset: AnyToolset): toolset is MCPToolset =>
  toolset.type === ToolsetTypes.DialMcp;

const isCodeInterpreterToolset = (toolset: AnyToolset): toolset is CodeInterpreterToolset =>
  toolset.type === ToolsetTypes.CodeInterpreter &&
  (toolset as CodeInterpreterToolset).template_name === CodeInterpreterTemplate.PyInterpreter;

export const isDialAppToolset = (toolset: AnyToolset): toolset is DialAppToolset =>
  toolset.type === ToolsetTypes.DialApp;

export const isUnknownToolset = (toolset: AnyToolset): toolset is UnknownToolset =>
  !isDialDeploymentToolset(toolset) &&
  !isMcpToolset(toolset) &&
  !isCodeInterpreterToolset(toolset) &&
  !isDialAppToolset(toolset);
