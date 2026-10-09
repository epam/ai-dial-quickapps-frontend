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
import { DialEntityType } from '@/types/dial-entities';
import type { QuickApp2Config } from '@/types/quick-apps';
import { decodeApiUrl, isHiddenDialFolderId, isPublicToolsetId } from '@/utils/api';
import {
  appConfigApi,
  applicationsApi,
  deploymentsApi,
  externalServicesApi,
  isForbiddenError,
  isNotFoundError,
  skillsApi,
  toolsetsApi,
} from '@/utils/chat-api-client';
import { parseAllowedOrigins } from '@/utils/allowed-origins';
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
 * Used to surface MCP-capable agents in the Agents picker alongside the chat-interface deployments fetched via `fetchDialModels`.
 */
const MCP_DEPLOYMENT_INTERFACE = ListDeploymentsInterfaceTypeEnum.Mcp;

/** chat-api client-config app id whose config QuickApps reads (default model, custom variables). */
const CLIENT_CONFIG_APP_ID = 'chat-ui';

/**
 * Encode each path segment individually, preserving '/' as a separator.
 *
 * chat-api's application/deployment/toolset ids are canonically stored and
 * returned with special characters already percent-encoded (e.g. a space is
 * literally `%20` inside the id string, confirmed against a working
 * PATCH /applications/{applicationName} request/response pair whose response
 * body's `id` field itself contains `%20`, not a real space). This app's
 * internal `appId`/`toolset.id` is kept decoded (see decodeDialPath below,
 * used once on mount) for display purposes, so it must be re-encoded back to
 * that canonical form here before use as a path parameter — the generated
 * client's own encodeURIComponent then wraps it once more for URL transport,
 * which is why the wire ends up "double-encoded" (e.g. `%2520`): that's
 * chat-api's expected shape, not a bug.
 */
export const encodeDialPath = (id: string): string =>
  id.split('/').map(encodeURIComponent).join('/');

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

const mapDeploymentToDialModel = (entity: DeploymentItemDto): DialModel => {
  // Keep the internal id decoded — see encodeDialPath's comment. The form
  // re-encodes it once on save, so an id left encoded here ends up `%2520`.
  const id = decodeDialPath(entity.id);
  return {
    id,
    reference: id,
    name: toDisplayName(entity.displayName, id),
    type: entity.type === 'application' ? DialEntityType.Application : DialEntityType.Model,
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
          tools: entity.features.tools,
        }
      : undefined,
    updatedAt: entity.updatedAt,
    inputAttachmentTypes: entity.inputAttachmentTypes,
  };
};

const mapToolsetToDialToolset = (entity: DialToolsetDto): DialToolset => {
  // Keep the internal id decoded — see mapDeploymentToDialModel.
  const id = decodeDialPath(entity.id);
  const authSettings = mapAuthSettings(id, entity.authSettings);
  return {
    id,
    reference: entity.reference ?? id,
    name: toDisplayName(entity.displayName, id),
    type: DialEntityType.Toolset,
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
};

const mapAuthSettings = (
  toolsetId: string,
  authSettings?: DialToolsetAuthSettingsDto,
): ToolsetAuthSettings | undefined => {
  if (!authSettings?.authenticationType) return undefined;
  // Public toolsets are signed in per-user, private ones per-workspace — mirrors
  // the level selection in applyToolsetAuthResult.
  const authStatus = isPublicToolsetId(toolsetId)
    ? authSettings.userLevelAuthStatus
    : authSettings.globalAuthStatus;
  return {
    authenticationType:
      authSettings.authenticationType as ToolsetAuthSettings['authenticationType'],
    authStatus: authStatus as ToolsetAuthSettings['authStatus'],
    apiKeyHeader: authSettings.apiKeyHeader,
  };
};

export const fetchApplicationRequiresAuthentication = async (appId: string): Promise<boolean> => {
  // Re-encode to chat-api's canonical id form — see encodeDialPath's comment.
  const services = await externalServicesApi.listExternalServices({
    appId: encodeDialPath(appId),
  });
  return services.length > 0;
};

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
export const fetchDialModels = async (): Promise<DialModel[]> => {
  const res: DeploymentsResponseDto = await deploymentsApi.listDeployments({
    interfaceType: [CHAT_DEPLOYMENT_INTERFACE],
  });
  return res.deployments
    .filter((entity) => entity.type === 'model' || entity.type === 'application')
    .filter((entity) => !isHiddenDialFolderId(entity.id))
    .map(mapDeploymentToDialModel);
};

/**
 * Fetches deployments exposing an MCP interface and returns only the
 * application-typed ones (MCP-capable agents). The same endpoint also
 * surfaces toolsets under this interface tag — those are filtered out by
 * the caller, which already has the toolset list to dedupe against.
 */
export const fetchDialMcpAgents = async (): Promise<DialModel[]> => {
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
};

/**
 * Decode URL-encoded fields in application_properties that DIAL Core stores encoded.
 * Also migrates the legacy `name` field to `deployment_id` in orchestrator.deployment.
 */
const mapApplicationPropertiesFromApi = (properties: unknown): unknown => {
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
};

/** Re-encode context and skill URLs before sending to DIAL Core. */
const encodeApplicationPropertiesForApi = (properties: unknown): unknown => {
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
};

interface CustomVariables {
  allowedOrigins: string[];
  dialAdminHost?: string;
  dialChatHost?: string;
  isCodeInterpreterEnabled?: boolean;
  isWebFetchEnabled?: boolean;
  isAddAttachmentEnabled?: boolean;
}

const readCustomVariables = (value: unknown): CustomVariables => {
  if (value == null || typeof value !== 'object') return { allowedOrigins: [] };
  const record = value as Record<string, unknown>;
  const asString = (key: string): string | undefined =>
    typeof record[key] === 'string' ? (record[key] as string) : undefined;
  const asBoolean = (key: string): boolean | undefined =>
    typeof record[key] === 'boolean' ? (record[key] as boolean) : undefined;
  return {
    allowedOrigins: parseAllowedOrigins(record.allowedOrigin),
    dialAdminHost: asString('dialAdminHost'),
    dialChatHost: asString('dialChatHost'),
    isCodeInterpreterEnabled: asBoolean('codeInterpreterEnabled'),
    isWebFetchEnabled: asBoolean('webFetchEnabled'),
    isAddAttachmentEnabled: asBoolean('addAttachmentEnabled'),
  };
};

export const fetchAppSettings = async (): Promise<AppSettings> => {
  try {
    const res = await appConfigApi.getClientConfig({ appId: CLIENT_CONFIG_APP_ID });
    const custom = readCustomVariables(res.config.customVariables);
    return {
      isCodeInterpreterEnabled: custom.isCodeInterpreterEnabled === true,
      isWebFetchEnabled: custom.isWebFetchEnabled === true,
      isAddAttachmentEnabled: custom.isAddAttachmentEnabled === true,
      dialCoreExternalUrl: res.config.dialCoreExternalUrl ?? undefined,
      defaultModelId: res.config.defaultDeploymentId ?? undefined,
      allowedOrigins: custom.allowedOrigins,
      dialAdminHost: custom.dialAdminHost,
      dialChatHost: custom.dialChatHost,
    };
  } catch {
    return {};
  }
};

/**
 * General-step display fields (name, description, iconUrl, topics, version)
 * live only on the deployments *list* entry (`DeploymentItemDto`), not on
 * `ApplicationDetailsDto` — chat-api's per-app details endpoint doesn't
 * return them. Loading one app therefore needs both calls; flagged as a
 * follow-up worth asking the ai-dial-chat team to fold into one response.
 */
const fetchApplicationSummary = async (appId: string): Promise<DeploymentItemDto | undefined> => {
  const res = await deploymentsApi.listDeployments({ interfaceType: [CHAT_DEPLOYMENT_INTERFACE] });
  return res.deployments.find((d) => d.id === appId);
};

export const fetchDialApp = async (appId: string): Promise<DialApp | null> => {
  let details;
  try {
    [details] = await Promise.all([
      // Re-encode to chat-api's canonical id form — see encodeDialPath's comment.
      deploymentsApi.getDeploymentDetails({ deployment: encodeDialPath(appId) }),
    ]);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    if (isForbiddenError(error)) throw new ForbiddenError();
    throw error;
  }
  // The summary only adds display fields; a failed listing must not fail the load.
  let summary: DeploymentItemDto | undefined;
  try {
    summary = await fetchApplicationSummary(appId);
  } catch {
    summary = undefined;
  }
  const appDetails = details.applicationDetails;
  // appDetails.displayName comes from the same getDeploymentDetails call that
  // just succeeded, so it's always available; summary (a separate, interface-
  // filtered /deployments listing) can miss this app entirely — e.g. when it
  // isn't tagged with the 'chat' interface — leaving `summary` undefined. Without
  // this appDetails fallback, `name` silently became the raw entity id (slashes
  // and all), which then fails chat-api's `name` validator on save.
  const displayName = appDetails?.displayName ?? summary?.displayName;

  return {
    id: appId,
    name: toDisplayName(displayName, appId),
    applicationTypeSchemaId: appDetails?.applicationTypeSchemaId,
    applicationProperties: mapApplicationPropertiesFromApi(appDetails?.applicationProperties),
    inputAttachmentTypes: appDetails?.inputAttachmentTypes ?? [],
    maxInputAttachments: appDetails?.maxInputAttachments,
    // Stored so saveDialApp can reconstruct the fields it doesn't itself own.
    _rawForSave: {
      displayName,
      description: summary?.description,
      iconUrl: summary?.iconUrl,
      topics: summary?.topics,
      displayVersion: summary?.displayVersion,
    },
  };
};

export const saveDialApp = async (
  app: DialApp,
  applicationProperties: unknown,
  general?: StoredGeneralFields,
): Promise<{
  id: string;
  applicationProperties: unknown;
  [key: string]: unknown;
}> => {
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
    // Re-encode to chat-api's canonical id form — see encodeDialPath's comment.
    applicationName: encodeDialPath(app.id),
    updateApplicationBodyDto: {
      name,
      description,
      iconUrl: general ? general.iconUrl : (rawForSave.iconUrl as string | undefined),
      topics: general ? general.topics : (rawForSave.topics as string[] | undefined),
      // Host-supplied only — never fall back to the load-time `_rawForSave`
      // snapshot, which goes stale after the first save. Omitted means chat-api
      // leaves the stored displayVersion unchanged.
      version: general?.display_version?.trim() || undefined,
      inputAttachmentTypes: app.inputAttachmentTypes as string[] | undefined,
      maxInputAttachments: app.maxInputAttachments as number | undefined,
      applicationProperties: encodeApplicationPropertiesForApi(applicationProperties) as object,
      locales: general?.locales,
      primaryLocale: general?.primaryLocale,
    },
  });

  return {
    ...updated,
    id: app.id,
    applicationProperties,
  };
};

export const fetchDialToolsets = async (): Promise<DialToolset[]> => {
  const res = await toolsetsApi.listToolsets();
  return res.data.map(mapToolsetToDialToolset).filter((t) => !isHiddenPath(t.id));
};

interface CoreSkillItem {
  url: string;
  name: string;
  bucket?: string;
  path?: string;
  description?: string;
  author?: string;
  updatedAt?: number;
  isMy?: boolean;
  canEdit?: boolean;
  sharedWithMe?: boolean;
}

/**
 * chat-api's skill metadata has no version or tags yet; they are read
 * defensively so the catalog shows them as soon as the listing carries them.
 */
const getOptionalSkillFields = (item: CoreSkillItem): Pick<DialSkill, 'version' | 'tags'> => {
  const extra = item as CoreSkillItem & { version?: unknown; tags?: unknown };
  return {
    ...(typeof extra.version === 'string' && extra.version !== '' && { version: extra.version }),
    ...(Array.isArray(extra.tags) && {
      tags: extra.tags.filter((tag): tag is string => typeof tag === 'string'),
    }),
  };
};

export const mapCoreToDialSkill = (item: CoreSkillItem): DialSkill => {
  const id = decodeApiUrl(item.url);
  return {
    id,
    reference: id,
    name: item.name,
    type: DialEntityType.Skill,
    description: item.description,
    bucket: item.bucket,
    path: item.path,
    updatedAt: item.updatedAt,
    author: item.author,
    isMy: item.isMy,
    canEdit: item.canEdit,
    sharedWithMe: item.sharedWithMe,
    ...getOptionalSkillFields(item),
  };
};

/** chat-api's catalog endpoint returns personal, public and shared skills; they are merged into one list here. */
export const fetchDialSkills = async (): Promise<DialSkill[]> => {
  const res = await skillsApi.listCatalogSkills();
  return [...res.skills, ...res.publicSkills, ...res.sharedWithMe]
    .map(mapCoreToDialSkill)
    .filter((skill) => !isHiddenDialFolderId(skill.id));
};

// kept for callers that still fetch a raw response directly (e.g. resolve-icon-url's
// `<img>` src, which stays outside the typed client — see resolve-icon-url.ts).
export { chatApiFetch };
