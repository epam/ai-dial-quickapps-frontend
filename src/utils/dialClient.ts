import type {
  AppSettings,
  DialApp,
  DialModel,
  DialPrompt,
  DialToolset,
  ToolsetAuthSettings,
} from '@/types/dial-entities';
import type { QuickApp2Config } from '@/types/quick-apps';
import { ApplicationStatus, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';
import { handleUnauthorizedResponse } from '@/utils/handle-unauthorized-response';

/** Encode each path segment individually, preserving '/' as a separator. */
const encodeDialPath = (id: string): string => id.split('/').map(encodeURIComponent).join('/');

/** Decode each path segment individually. */
export const decodeDialPath = (url: string): string =>
  url.split('/').map(decodeURIComponent).join('/');

interface CoreApiEntity {
  id: string;
  reference: string;
  display_name?: string;
  display_version?: string;
  icon_url?: string;
  object: string;
  application_type_schema_id?: string;
  description?: string;
  description_keywords?: string[];
  mcp?: boolean;
  features?: {
    temperature?: boolean;
    tools?: boolean;
    system_prompt?: boolean;
    mcp?: boolean;
    [key: string]: boolean | undefined;
  };
  function?: {
    status?: ApplicationStatus;
  };
}

interface ToolsetApiAuthSettings {
  authentication_type?: ToolsetAuthType;
  api_key_header?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  client_id?: string;
  scopes_supported?: string[];
  code_challenge?: string;
  code_challenge_method?: string;
  redirect_uri?: string;
  global_auth_status?: ToolsetAuthStatus;
  user_level_auth_status?: ToolsetAuthStatus;
}

interface ToolsetApiEntity {
  id?: string;
  toolset?: string;
  name?: string;
  reference?: string;
  display_name?: string;
  display_version?: string;
  icon_url?: string;
  mcp?: boolean;
  features?: { mcp?: boolean };
  auth_settings?: ToolsetApiAuthSettings;
  description?: string;
  description_keywords?: string[];
}

function normalizeIconUrl(iconUrl?: string): string | undefined {
  if (!iconUrl) return undefined;
  if (/^https?:\/\//i.test(iconUrl)) return iconUrl;
  return iconUrl
    .split('/')
    .map((s) => decodeURIComponent(s))
    .join('/');
}

function mapAuthSettings(authSettings?: ToolsetApiAuthSettings): ToolsetAuthSettings | undefined {
  if (!authSettings?.authentication_type) return undefined;
  return {
    authenticationType: authSettings.authentication_type,
    // This app has no per-user/org credential split, so a user-level
    // sign-in takes precedence over an org-wide one.
    authStatus: authSettings.user_level_auth_status ?? authSettings.global_auth_status,
    apiKeyHeader: authSettings.api_key_header,
    authorizationEndpoint: authSettings.authorization_endpoint,
    tokenEndpoint: authSettings.token_endpoint,
    clientId: authSettings.client_id,
    scopesSupported: authSettings.scopes_supported,
    codeChallenge: authSettings.code_challenge,
    codeChallengeMethod: authSettings.code_challenge_method,
    redirectUri: authSettings.redirect_uri,
  };
}

async function dialFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api/dial${path}`);
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`DIAL API ${res.status} for ${path}: session expired`);
    }
    const body = await res.text().catch(() => '');
    const err = new Error(`DIAL API ${res.status} for ${path}: ${body}`);
    console.error(err.message);
    throw err;
  }
  return res.json() as Promise<T>;
}

function mapCoreToDialModel(entity: CoreApiEntity): DialModel {
  return {
    id: decodeURIComponent(entity.id),
    reference: entity.reference,
    name: entity.display_name ?? entity.id,
    type: entity.object as 'model' | 'application',
    version: entity.display_version,
    iconUrl: normalizeIconUrl(entity.icon_url),
    applicationTypeSchemaId: entity.application_type_schema_id,
    description: entity.description,
    topics: entity.description_keywords,
    mcp: entity.mcp,
    features: entity.features
      ? {
          temperature: entity.features.temperature,
          tools: entity.features.tools,
          systemPrompt: entity.features.system_prompt,
          mcp: entity.features.mcp,
        }
      : undefined,
    functionStatus: entity.function?.status,
  };
}

function mapApiToDialToolset(data: ToolsetApiEntity): DialToolset {
  const rawId = data.id ?? data.toolset ?? data.name ?? '';
  const id = decodeURIComponent(rawId);
  return {
    id,
    reference: data.reference ?? id,
    name: data.display_name ?? id,
    type: 'toolset',
    version: data.display_version,
    iconUrl: normalizeIconUrl(data.icon_url),
    mcp: data.mcp,
    features: data.features,
    authSettings: mapAuthSettings(data.auth_settings),
    description: data.description,
    topics: data.description_keywords,
  };
}

export async function fetchDialBucket(): Promise<string> {
  const { bucket } = await dialFetch<{ bucket: string }>('/v1/bucket');
  return bucket;
}

/**
 * /v1/deployments returns models, applications and toolsets in one call.
 * Unlike /openai/deployments, it reliably includes applications, so we fetch
 * it once instead of separately hitting /openai/models and /openai/applications.
 */
export async function fetchDialModels(): Promise<DialModel[]> {
  const res = await dialFetch<CoreApiEntity[]>('/v1/deployments');
  return res
    .filter((entity) => entity.object === 'model' || entity.object === 'application')
    .map(mapCoreToDialModel);
}

interface CoreApplicationResponse {
  /** Present when the app is a publication; entity identifier. */
  application?: string;
  /** Present for personal/shared apps; entity identifier. */
  name?: string;
  display_name?: string;
  application_type_schema_id?: string;
  application_properties?: unknown;
  [key: string]: unknown;
}

/**
 * Decode URL-encoded fields in application_properties that DIAL Core stores encoded.
 * Also migrates the legacy `name` field to `deployment_id` in orchestrator.deployment.
 */
function mapApplicationPropertiesFromApi(properties: unknown): unknown {
  if (properties == null) return properties;

  const config = properties as QuickApp2Config;
  const result: QuickApp2Config = { ...config };

  if (config.contexts?.length) {
    result.contexts = config.contexts.map((ctx) => ({
      ...ctx,
      url: decodeDialPath(ctx.url),
    }));
  }

  if (config.skills?.length) {
    result.skills = config.skills.map((skill) => ({
      ...skill,
      url: decodeDialPath((skill as { url: string }).url),
    })) as QuickApp2Config['skills'];
  }

  // Migrate deprecated orchestrator.deployment.name → deployment_id
  const dep = config?.orchestrator?.deployment as
    (QuickApp2Config['orchestrator']['deployment'] & { name?: string }) | undefined;
  if (dep && typeof dep.name === 'string' && !dep.deployment_id) {
    result.orchestrator = {
      ...config.orchestrator,
      deployment: {
        ...dep,
        deployment_id: dep.name,
        name: undefined,
      } as QuickApp2Config['orchestrator']['deployment'],
    };
  }

  return result;
}

/** Re-encode context and skill URLs before sending to DIAL Core. */
function encodeApplicationPropertiesForApi(properties: unknown): unknown {
  if (properties == null) return properties;

  const config = properties as QuickApp2Config;
  const encoded = { ...config };

  if (config.contexts?.length) {
    encoded.contexts = config.contexts.map((ctx) => ({
      ...ctx,
      url: encodeDialPath(ctx.url),
    }));
  }

  if (config.skills?.length) {
    encoded.skills = config.skills.map((skill) => ({
      ...skill,
      url: encodeDialPath((skill as { url: string }).url),
    })) as QuickApp2Config['skills'];
  }

  return encoded;
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const res = await fetch('/api/settings');
  if (!res.ok) return {};
  return res.json() as Promise<AppSettings>;
}

export async function fetchDialApp(appId: string): Promise<DialApp | null> {
  const res = await fetch(`/api/dial/v1/${encodeDialPath(appId)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`DIAL API ${res.status} for /${appId}: session expired`);
    }
    const body = await res.text().catch(() => '');
    const err = new Error(`DIAL API ${res.status} for /${appId}: ${body}`);
    console.error(err.message);
    throw err;
  }
  const raw = (await res.json()) as CoreApplicationResponse;

  // Strip entity-identifier fields — they go in the URL, not the PUT body.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { application: _a, name: _n, ...rawForSave } = raw;

  return {
    id: appId,
    name: raw.display_name ?? appId,
    applicationTypeSchemaId: raw.application_type_schema_id,
    applicationProperties: mapApplicationPropertiesFromApi(raw.application_properties),
    inputAttachmentTypes: (raw.input_attachment_types as string[] | undefined) ?? [],
    maxInputAttachments: raw.max_input_attachments as number | undefined,
    // Stored so saveDialApp can reconstruct the full PUT body without data loss.
    _rawForSave: rawForSave,
  };
}

export async function saveDialApp(
  app: DialApp,
  applicationProperties: unknown,
): Promise<{
  id: string;
  applicationProperties: unknown;
  [key: string]: unknown;
}> {
  const rawForSave = (app._rawForSave as Record<string, unknown>) ?? {};
  const body: Record<string, unknown> = {
    display_name: rawForSave.display_name ?? app.name,
    display_version: rawForSave.display_version,
    icon_url: rawForSave.icon_url,
    description: rawForSave.description,
    features: rawForSave.features,
    input_attachment_types:
      (app.inputAttachmentTypes as string[] | undefined) ?? rawForSave.input_attachment_types,
    max_input_attachments:
      (app.maxInputAttachments as number | undefined) ?? rawForSave.max_input_attachments,
    reference: rawForSave.reference,
    description_keywords: rawForSave.description_keywords,
    application_type_schema_id:
      rawForSave.application_type_schema_id ?? app.applicationTypeSchemaId,
    application_properties: encodeApplicationPropertiesForApi(applicationProperties),
  };
  const res = await fetch(`/api/dial/v1/${encodeDialPath(app.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`DIAL API ${res.status}: session expired`);
    }
    const text = await res.text().catch(() => '');
    console.error('[saveDialApp] PUT body:', JSON.stringify(body, null, 2));
    console.error('[saveDialApp] DIAL Core', res.status, res.headers.get('content-type'), text);
    throw new Error(`DIAL API ${res.status}: ${text}`);
  }
  return res.json() as Promise<{
    id: string;
    applicationProperties: unknown;
    [key: string]: unknown;
  }>;
}

export async function fetchDialToolsets(): Promise<DialToolset[]> {
  const res = await dialFetch<{ data: ToolsetApiEntity[] }>('/openai/toolsets');
  return res.data.map(mapApiToDialToolset);
}

export interface DialFileMetadataItem {
  name: string;
  bucket?: string;
  parentPath?: string | null;
  contentType?: string;
  contentLength?: number;
  nodeType: 'ITEM' | 'FOLDER';
  items?: DialFileMetadataItem[];
}

export async function fetchDialFiles(path = 'files'): Promise<DialFileMetadataItem[]> {
  const res = await dialFetch<{ items?: DialFileMetadataItem[] }>(
    `/v1/metadata/${path}?limit=1000&recursive=true`,
  );
  return res.items ?? [];
}

async function fetchPromptsFromBucket(bucket: string): Promise<DialPrompt[]> {
  const qs = new URLSearchParams({ bucket, limit: '1000', recursive: 'true' });
  let res: { items?: DialFileMetadataItem[] };
  try {
    const response = await fetch(`/api/dial-prompts/list?${qs}`);
    if (!response.ok) return [];
    res = (await response.json()) as { items?: DialFileMetadataItem[] };
  } catch {
    return [];
  }
  return (res.items ?? [])
    .filter((item) => item.nodeType === 'ITEM')
    .map((item) => {
      const parts = ['prompts', bucket];
      if (item.parentPath) parts.push(item.parentPath);
      parts.push(item.name);
      const id = parts.join('/');
      return {
        id,
        name: item.name,
        folderId: id.slice(0, id.lastIndexOf('/')),
      };
    });
}

export async function fetchDialPrompts(): Promise<DialPrompt[]> {
  const { bucket } = await dialFetch<{ bucket: string }>('/v1/bucket');
  const [personal, organization] = await Promise.all([
    fetchPromptsFromBucket(bucket),
    fetchPromptsFromBucket('public'),
  ]);
  return [...personal, ...organization];
}
