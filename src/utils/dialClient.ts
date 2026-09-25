import {
  DeploymentItemDto,
  DeploymentsResponseDto,
  DialToolsetAuthSettingsDto,
  DialToolsetDto,
  ListDeploymentsInterfaceTypeEnum,
} from '@epam/ai-dial-chat-api-client';

import type {
  AppSettings,
  DialApp,
  DialModel,
  DialSkill,
  DialToolset,
  LocalizedText,
  ToolsetAuthSettings,
} from '@/types/dial-entities';
import type { LocaleTextEntryDto } from '@/types/editor-messages';
import type { QuickApp2Config } from '@/types/quick-apps';
import { decodeApiUrl, isHiddenDialFolderId, isPublicToolsetId } from '@/utils/api';
import {
  appConfigApi,
  applicationsApi,
  deploymentsApi,
  isForbiddenError,
  isNotFoundError,
  skillsApi,
  toolsetsApi,
} from '@/utils/chat-api-client';
import { chatApiFetch } from '@/utils/chat-api-fetch';
import { isHiddenPath } from '@/utils/dial-file-path';
import { ForbiddenError } from '@/utils/forbidden-error';
import { getLocalizedText } from '@/utils/get-localized-text';
import type { StoredGeneralFields } from '@/utils/has-quick-app-changes';

/**
 * DIAL Core interface tag required for an entity to be usable from this app.
 * Quick App orchestrators invoke deployments the same way chat does (chat
 * completions), so this mirrors ai-dial-chat's own `interface_type=chat`
 * scoping — matches its eligible deployment set (and therefore its favorites
 * count) instead of showing every deployment regardless of interface.
 */
const CHAT_DEPLOYMENT_INTERFACE = ListDeploymentsInterfaceTypeEnum.Chat;

/**
 * DIAL Core interface tag for deployments that expose an MCP interface.
 * Used to surface MCP-capable agents in the Agents & Toolsets picker
 * alongside the chat-interface deployments fetched via `fetchDialModels`.
 */
const MCP_DEPLOYMENT_INTERFACE = ListDeploymentsInterfaceTypeEnum.Mcp;

/** Encode each path segment individually, preserving '/' as a separator. */
const encodeDialPath = (id: string): string => id.split('/').map(encodeURIComponent).join('/');

/** Decode each path segment individually. */
export const decodeDialPath = (url: string): string =>
  url.split('/').map(decodeURIComponent).join('/');

/**
 * chat-api responses are typed, but a `LocalizedText`-shaped field can still
 * legitimately be `undefined` (untranslated) — flatten it to a plain display
 * string the same way this app has always displayed such fields.
 */
const toDisplayName = (value: LocalizedText | undefined, fallback: string): string =>
  getLocalizedText(value, 'en', fallback);

const toDisplayText = (value: LocalizedText | undefined): string | undefined =>
  value == null ? undefined : getLocalizedText(value, 'en', '') || undefined;

function mapDeploymentToDialModel(entity: DeploymentItemDto): DialModel {
  return {
    id: entity.id,
    reference: entity.id,
    name: toDisplayName(entity.displayName, entity.id),
    type: entity.type === 'application' ? 'application' : 'model',
    version: entity.displayVersion,
    iconUrl: entity.iconUrl,
    applicationTypeSchemaId: entity.applicationTypeSchemaId,
    description: toDisplayText(entity.description),
    topics: entity.topics,
    mcp: entity.features?.mcp,
    features: entity.features
      ? {
          temperature: entity.features.temperature,
          systemPrompt: entity.features.systemPrompt,
          mcp: entity.features.mcp,
        }
      : undefined,
    updatedAt: entity.updatedAt,
    inputAttachmentTypes: entity.inputAttachmentTypes,
  };
}

function mapToolsetToDialToolset(entity: DialToolsetDto): DialToolset {
  const id = entity.id;
  const authSettings = mapAuthSettings(id, entity.authSettings);
  return {
    id,
    reference: entity.reference ?? id,
    name: toDisplayName(entity.displayName, id),
    type: 'toolset',
    version: entity.displayVersion,
    iconUrl: entity.iconUrl,
    // Toolsets are inherently MCP entities in this app's domain — chat-api's
    // toolset DTO has no per-item mcp flag to echo (unlike deployments).
    mcp: true,
    features: { mcp: true },
    authSettings,
    description: toDisplayText(entity.description),
    topics: entity.descriptionKeywords,
    updatedAt: entity.updatedAt,
  };
}

function mapAuthSettings(
  toolsetId: string,
  authSettings?: DialToolsetAuthSettingsDto,
): ToolsetAuthSettings | undefined {
  if (!authSettings?.authenticationType) return undefined;
  // Public toolsets are signed in per-user, private ones per-workspace — mirrors
  // the level selection in applyToolsetLoginResult.
  const authStatus = isPublicToolsetId(toolsetId)
    ? authSettings.userLevelAuthStatus
    : authSettings.globalAuthStatus;
  return {
    authenticationType:
      authSettings.authenticationType as ToolsetAuthSettings['authenticationType'],
    authStatus: authStatus as ToolsetAuthSettings['authStatus'],
    apiKeyHeader: authSettings.apiKeyHeader,
  };
}

/**
 * chat-api's typed `ApplicationDetailsDto` (from `getDeploymentDetails`) has
 * no equivalent of Core's raw `external_services` map, so there is currently
 * no typed way to answer "does this application need external-service
 * sign-in before use". Rather than guess at an endpoint, this returns `false`
 * (never blocks the UI) until chat-api exposes this — flagged for follow-up
 * with the ai-dial-chat team, same as the `intro` field gap.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- appId kept in the signature for call-site clarity and future use
export async function fetchApplicationRequiresAuthentication(_appId: string): Promise<boolean> {
  return false;
}

/**
 * /v1/deployments returns models, applications and toolsets in one call.
 * Unlike /openai/deployments, it reliably includes applications, so we fetch
 * it once instead of separately hitting /openai/models and /openai/applications.
 *
 * DIAL Core itself filters server-side on `interface_type` (ai-dial-chat's
 * BFF passes this same param when listing deployments) — without it, Core
 * returns every deployment regardless of interface, which is why this app
 * was seeing ~871 raw deployments vs. chat's ~495. Passing it here, not
 * filtering client-side afterwards, is what actually narrows the set.
 */
export async function fetchDialModels(): Promise<DialModel[]> {
  const res: DeploymentsResponseDto = await deploymentsApi.listDeployments({
    interfaceType: [CHAT_DEPLOYMENT_INTERFACE],
  });
  return res.deployments
    .filter((entity) => entity.type === 'model' || entity.type === 'application')
    .filter((entity) => !isHiddenDialFolderId(entity.id))
    .map(mapDeploymentToDialModel);
}

/**
 * Fetches deployments exposing an MCP interface and returns only the
 * application-typed ones (MCP-capable agents). The same endpoint also
 * surfaces toolsets under this interface tag — those are filtered out by
 * the caller, which already has the toolset list to dedupe against.
 */
export async function fetchDialMcpAgents(): Promise<DialModel[]> {
  const res = await deploymentsApi.listDeployments({ interfaceType: [MCP_DEPLOYMENT_INTERFACE] });
  return (
    res.deployments
      .filter((entity) => entity.type === 'application')
      .filter((entity) => !isHiddenDialFolderId(entity.id))
      .map(mapDeploymentToDialModel)
      // Being returned by the mcp-interface query is itself the proof of MCP
      // support — Core doesn't reliably echo an `mcp`/`features.mcp` flag on
      // these entries, so stamp it explicitly rather than trusting the payload.
      .map((model) => ({ ...model, mcp: true, features: { ...model.features, mcp: true } }))
  );
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

interface CustomVariables {
  allowedOrigin?: string;
  dialAdminHost?: string;
  dialChatHost?: string;
  applicationName?: string;
}

const readCustomVariables = (value: unknown): CustomVariables => {
  if (value == null || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  const asString = (key: string): string | undefined =>
    typeof record[key] === 'string' ? (record[key] as string) : undefined;
  return {
    allowedOrigin: asString('allowedOrigin'),
    dialAdminHost: asString('dialAdminHost'),
    dialChatHost: asString('dialChatHost'),
    applicationName: asString('applicationName'),
  };
};

export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const res = await appConfigApi.getClientConfig({ appId: 'chat-ui' });
    const features = (res.features ?? {}) as Record<string, unknown>;
    const custom = readCustomVariables(res.config.customVariables);
    return {
      isCodeInterpreterEnabled: features.codeInterpreter === true,
      isWebFetchEnabled: features.webFetch === true,
      isAddAttachmentEnabled: features.attachments === true,
      dialCoreExternalUrl: res.config.dialCoreExternalUrl ?? undefined,
      defaultModelId: res.config.defaultDeploymentId ?? undefined,
      allowedOrigin: custom.allowedOrigin,
      dialAdminHost: custom.dialAdminHost,
      dialChatHost: custom.dialChatHost,
      applicationName: custom.applicationName,
    };
  } catch {
    return {};
  }
}

/**
 * General-step display fields (name, description, iconUrl, topics, version)
 * live only on the deployments *list* entry (`DeploymentItemDto`), not on
 * `ApplicationDetailsDto` — chat-api's per-app details endpoint doesn't
 * return them. Loading one app therefore needs both calls; flagged as a
 * follow-up worth asking the ai-dial-chat team to fold into one response.
 */
async function fetchApplicationSummary(appId: string): Promise<DeploymentItemDto | undefined> {
  const res = await deploymentsApi.listDeployments({ interfaceType: [CHAT_DEPLOYMENT_INTERFACE] });
  return res.deployments.find((d) => d.id === appId);
}

export async function fetchDialApp(appId: string): Promise<DialApp | null> {
  let details;
  try {
    [details] = await Promise.all([deploymentsApi.getDeploymentDetails({ deployment: appId })]);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    if (isForbiddenError(error)) throw new ForbiddenError();
    throw error;
  }
  const summary = await fetchApplicationSummary(appId).catch(() => undefined);
  const appDetails = details.applicationDetails;

  return {
    id: appId,
    name: toDisplayName(summary?.displayName, appId),
    applicationTypeSchemaId: appDetails?.applicationTypeSchemaId,
    applicationProperties: mapApplicationPropertiesFromApi(appDetails?.applicationProperties),
    inputAttachmentTypes: appDetails?.inputAttachmentTypes ?? [],
    maxInputAttachments: appDetails?.maxInputAttachments,
    // Stored so saveDialApp can reconstruct the fields it doesn't itself own.
    _rawForSave: {
      displayName: summary?.displayName,
      description: summary?.description,
      iconUrl: summary?.iconUrl,
      topics: summary?.topics,
      displayVersion: summary?.displayVersion,
    },
  };
}

export async function saveDialApp(
  app: DialApp,
  applicationProperties: unknown,
  general?: StoredGeneralFields,
): Promise<{
  id: string;
  applicationProperties: unknown;
  [key: string]: unknown;
}> {
  const rawForSave = (app._rawForSave as Record<string, unknown>) ?? {};
  const primaryLocale = general?.primaryLocale ?? 'en';
  const name =
    getLocalizedText(general?.name as LocalizedText | undefined, primaryLocale, '') ||
    getLocalizedText(rawForSave.displayName as LocalizedText | undefined, primaryLocale, app.name);
  const description =
    general != null
      ? getLocalizedText(general.description as LocalizedText | undefined, primaryLocale, '') ||
        undefined
      : toDisplayText(rawForSave.description as LocalizedText | undefined);

  const updated = await applicationsApi.updateApplication({
    applicationName: app.id,
    updateApplicationBodyDto: {
      name,
      description,
      iconUrl: general ? general.iconUrl : (rawForSave.iconUrl as string | undefined),
      topics: general ? general.topics : (rawForSave.topics as string[] | undefined),
      inputAttachmentTypes: app.inputAttachmentTypes as string[] | undefined,
      maxInputAttachments: app.maxInputAttachments as number | undefined,
      applicationProperties: encodeApplicationPropertiesForApi(applicationProperties) as object,
      locales: general?.locales as LocaleTextEntryDto[] | undefined,
      primaryLocale: general?.primaryLocale,
    },
  });

  return {
    ...updated,
    id: app.id,
    applicationProperties,
  };
}

export async function fetchDialToolsets(): Promise<DialToolset[]> {
  const res = await toolsetsApi.listToolsets();
  return res.data.map(mapToolsetToDialToolset).filter((t) => !isHiddenPath(t.id));
}

function mapCoreToDialSkill(item: {
  url: string;
  name: string;
  description?: string;
  author?: string;
  updatedAt?: number;
  isMy?: boolean;
  canEdit?: boolean;
  sharedWithMe?: boolean;
}): DialSkill {
  const id = decodeApiUrl(item.url);
  return {
    id,
    reference: id,
    name: item.name,
    type: 'skill',
    description: item.description,
    updatedAt: item.updatedAt,
    author: item.author,
    isMy: item.isMy,
    canEdit: item.canEdit,
    sharedWithMe: item.sharedWithMe,
  };
}

/** chat-api's own controller already does the personal+public+shared aggregation this app used to replicate against Core directly. */
export async function fetchDialSkills(): Promise<DialSkill[]> {
  const res = await skillsApi.listCatalogSkills();
  return [...res.skills, ...res.publicSkills, ...res.sharedWithMe]
    .map(mapCoreToDialSkill)
    .filter((skill) => !isHiddenDialFolderId(skill.id));
}

// kept for callers that still fetch a raw response directly (e.g. resolve-icon-url's
// `<img>` src, which stays outside the typed client — see resolve-icon-url.ts).
export { chatApiFetch };
