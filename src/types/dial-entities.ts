export interface DialModel {
  id: string;
  reference: string;
  name: string;
  type: "model" | "application";
  version?: string;
  iconUrl?: string;
  applicationTypeSchemaId?: string;
  mcp?: boolean;
  topics?: string[];
  features?: {
    temperature?: boolean;
    tools?: boolean;
    systemPrompt?: boolean;
    mcp?: boolean;
  };
  [key: string]: unknown;
}

export type ModelsMap = Record<string, DialModel>;

export interface DialToolset {
  id: string;
  reference: string;
  name: string;
  type: "toolset";
  version?: string;
  mcp?: boolean;
  features?: { mcp?: boolean };
  [key: string]: unknown;
}

export type ToolsetsMap = Record<string, DialToolset>;

export interface DialApp {
  id: string;
  name: string;
  type?: string;
  applicationProperties?: unknown;
  applicationTypeSchemaId?: string;
  mcp?: boolean;
  features?: { mcp?: boolean };
  sharedWithMe?: boolean;
  isShared?: boolean;
  [key: string]: unknown;
}

export interface AppSettings {
  isPublishingEnabled?: boolean;
  dialCoreExternalUrl?: string;
  isCodeInterpreterEnabled?: boolean;
  theme?: string;
}

export interface DialPrompt {
  id: string;
  name: string;
  folderId: string;
}

export type PromptsMap = Record<string, DialPrompt>;
