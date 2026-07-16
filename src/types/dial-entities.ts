export enum ApplicationStatus {
  Deployed = 'DEPLOYED',
  Deploying = 'DEPLOYING',
  Undeployed = 'UNDEPLOYED',
  Undeploying = 'UNDEPLOYING',
  Failed = 'FAILED',
  Redeployed = 'REDEPLOYED',
  Redeploying = 'REDEPLOYING',
}

export enum ToolsetAuthType {
  OAuth = 'OAUTH',
  ApiKey = 'API_KEY',
  None = 'NONE',
}

export enum ToolsetAuthStatus {
  SignedIn = 'SIGNED_IN',
  SignedOut = 'SIGNED_OUT',
  Failed = 'FAILED',
}

export interface ToolsetAuthSettings {
  authenticationType: ToolsetAuthType;
  authStatus?: ToolsetAuthStatus;
  apiKeyHeader?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  clientId?: string;
  scopesSupported?: string[];
  codeChallenge?: string;
  codeChallengeMethod?: string;
  redirectUri?: string;
}

export interface DialModel {
  id: string;
  reference: string;
  name: string;
  type: 'model' | 'application';
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
  functionStatus?: ApplicationStatus;
  description?: string;
  [key: string]: unknown;
}

export type ModelsMap = Record<string, DialModel>;

export interface DialToolset {
  id: string;
  reference: string;
  name: string;
  type: 'toolset';
  version?: string;
  iconUrl?: string;
  mcp?: boolean;
  features?: { mcp?: boolean };
  authSettings?: ToolsetAuthSettings;
  description?: string;
  topics?: string[];
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
  allowedOrigin?: string;
  defaultModelId?: string;
  dialAdminHost?: string;
  dialChatHost?: string;
  applicationName?: string;
}

export interface DialPrompt {
  id: string;
  name: string;
  folderId: string;
}

export type PromptsMap = Record<string, DialPrompt>;
