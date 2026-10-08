export enum ToolsetTypes {
  DialMcp = 'dial-mcp',
  DialApp = 'dial-app',
  DialDeployment = 'dial-deployment',
  CodeInterpreter = 'predefined',
}

export enum DialDeploymentToolsetToolTypes {
  DialDeploymentSimple = 'dial-deployment-simple',
}

export enum DialDeploymentToolsetName {
  Default = 'dial-deployment-tool-set',
}

export enum CodeInterpreterTemplate {
  PyInterpreter = 'py_interpreter',
}

export enum SkillRefType {
  DialSkill = 'dial-skill',
}

export enum TimestampInjectionStrategy {
  ToolCall = 'tool_call',
}

export enum AttachmentStrategyType {
  LazyOnDemand = 'lazy_on_demand',
}

export enum SystemPromptType {
  Custom = 'custom',
}

export enum ContextType {
  File = 'file',
}

export interface OrchestratorAttachmentStrategy {
  type: AttachmentStrategyType.LazyOnDemand;
}

export interface RepresentationToolingFeature {
  add_attachment: true;
}

export interface WebFetchFeature {
  enabled: boolean;
}

export enum ToolsetTransportType {
  HTTP = 'HTTP',
  SSE = 'SSE',
}

export interface QuickAppConfig {
  instructions: string;
  model: string;
  temperature: number;
  web_api_toolset: object;
  mcp_toolset?: object;
  document_relative_url?: string[];
}

export interface FileContext {
  url: string;
  type: ContextType.File;
}

export interface DialDeploymentSimpleTool {
  type: DialDeploymentToolsetToolTypes.DialDeploymentSimple;
  deployment_id: string;
}

export interface DialDeploymentToolset {
  name: DialDeploymentToolsetName.Default;
  type: ToolsetTypes.DialDeployment;
  tools: DialDeploymentSimpleTool[];
}

export enum DialAppTransportType {
  MCP = 'mcp',
  ChatCompletion = 'chat-completion',
  Auto = 'auto',
}

export interface DialAppToolset {
  name: string;
  deployment_id: string;
  type?: ToolsetTypes.DialApp;
  transport?: DialAppTransportType;
}

export interface MCPToolset {
  name?: string;
  type?: ToolsetTypes.DialMcp;
  deployment_id: string;
  transport?: ToolsetTransportType;
  description?: string;
}

export interface CodeInterpreterToolset {
  template_name: CodeInterpreterTemplate.PyInterpreter;
  type: ToolsetTypes.CodeInterpreter;
}

export interface UnknownTool extends Record<string, unknown> {
  type?: string;
}

export interface UnknownToolset extends Record<string, unknown> {
  type?: string;
  tools?: UnknownTool[];
}

export type AnyToolset =
  DialDeploymentToolset | MCPToolset | CodeInterpreterToolset | DialAppToolset | UnknownToolset;

export interface ConversationStarter {
  title: string;
  text: string;
}

export interface ConversationStarters {
  intro_text?: string;
  chat_message_input_disabled?: boolean;
  auto_submit?: boolean;
  starters: ConversationStarter[];
}

export interface DialSkillRef {
  type: SkillRefType.DialSkill;
  url: string;
}

export interface QuickApp2Config {
  orchestrator: {
    deployment: {
      deployment_id: string;
      parameters?: {
        temperature: number;
      };
    };
    system_prompt: {
      type: SystemPromptType.Custom;
      variables: object;
      content: string;
    };
    attachment_strategy?: OrchestratorAttachmentStrategy | null;
  };
  contexts: FileContext[];
  tool_sets: AnyToolset[];
  conversation_starters: ConversationStarters | null;
  input_attachment_types?: string[];
  max_input_attachments?: number;
  skills?: DialSkillRef[];
  features?: {
    timestamp?: {
      injection_strategy: TimestampInjectionStrategy.ToolCall;
    } | null;
    dial_files?: object | null;
    representation_tooling?: RepresentationToolingFeature | null;
    web_fetch?: WebFetchFeature | null;
  };
}

export function isDialDeploymentToolset(toolset: AnyToolset): toolset is DialDeploymentToolset {
  return toolset.type === ToolsetTypes.DialDeployment;
}

export function isDialDeploymentSimpleTool(tool: {
  type?: unknown;
}): tool is DialDeploymentSimpleTool {
  return tool.type === DialDeploymentToolsetToolTypes.DialDeploymentSimple;
}

export function isMcpToolset(toolset: AnyToolset): toolset is MCPToolset {
  return toolset.type === ToolsetTypes.DialMcp;
}

export function isCodeInterpreterToolset(toolset: AnyToolset): toolset is CodeInterpreterToolset {
  return (
    toolset.type === ToolsetTypes.CodeInterpreter &&
    (toolset as CodeInterpreterToolset).template_name === CodeInterpreterTemplate.PyInterpreter
  );
}

export function isDialAppToolset(toolset: AnyToolset): toolset is DialAppToolset {
  return toolset.type === ToolsetTypes.DialApp;
}

export function isUnknownToolset(toolset: AnyToolset): toolset is UnknownToolset {
  return (
    !isDialDeploymentToolset(toolset) &&
    !isMcpToolset(toolset) &&
    !isCodeInterpreterToolset(toolset) &&
    !isDialAppToolset(toolset)
  );
}
