import type { DialModel, DialToolset } from "@/types/dial-entities";

const DIAL_API_VERSION = "2025-01-01-preview";

interface CoreApiEntity {
  id: string;
  reference: string;
  display_name?: string;
  display_version?: string;
  object: string;
  application_type_schema_id?: string;
  mcp?: boolean;
  features?: {
    temperature?: boolean;
    tools?: boolean;
    system_prompt?: boolean;
    mcp?: boolean;
    [key: string]: boolean | undefined;
  };
}

interface ToolsetApiEntity {
  id?: string;
  toolset?: string;
  name?: string;
  reference?: string;
  display_name?: string;
  display_version?: string;
  mcp?: boolean;
  features?: { mcp?: boolean };
}

async function dialFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api/dial${path}`);
  if (!res.ok) {
    throw new Error(`DIAL API ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

function mapCoreToDialModel(entity: CoreApiEntity): DialModel {
  return {
    id: decodeURIComponent(entity.id),
    reference: entity.reference,
    name: entity.display_name ?? entity.id,
    type: entity.object as "model" | "application",
    version: entity.display_version,
    applicationTypeSchemaId: entity.application_type_schema_id,
    mcp: entity.mcp,
    features: entity.features
      ? {
          temperature: entity.features.temperature,
          tools: entity.features.tools,
          systemPrompt: entity.features.system_prompt,
          mcp: entity.features.mcp,
        }
      : undefined,
  };
}

function mapApiToDialToolset(data: ToolsetApiEntity): DialToolset {
  const rawId = data.id ?? data.toolset ?? data.name ?? "";
  const id = decodeURIComponent(rawId);
  return {
    id,
    reference: data.reference ?? id,
    name: data.display_name ?? id,
    type: "toolset",
    version: data.display_version,
    mcp: data.mcp,
    features: data.features,
  };
}

export async function fetchDialModels(): Promise<DialModel[]> {
  const [modelsRes, appsRes] = await Promise.all([
    dialFetch<{ data: CoreApiEntity[] }>(
      `/openai/models?api-version=${DIAL_API_VERSION}`,
    ),
    dialFetch<{ data: CoreApiEntity[] }>(
      `/openai/applications?api-version=${DIAL_API_VERSION}`,
    ),
  ]);
  return [...modelsRes.data, ...appsRes.data].map(mapCoreToDialModel);
}

export async function saveDialApp(
  appId: string,
  applicationProperties: unknown,
): Promise<{
  id: string;
  applicationProperties: unknown;
  [key: string]: unknown;
}> {
  const encodedId = encodeURIComponent(appId);
  const res = await fetch(
    `/api/dial/openai/applications/${encodedId}?api-version=${DIAL_API_VERSION}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationProperties }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`DIAL API ${res.status}: ${body}`);
  }
  return res.json() as Promise<{
    id: string;
    applicationProperties: unknown;
    [key: string]: unknown;
  }>;
}

export async function fetchDialToolsets(): Promise<DialToolset[]> {
  const res = await dialFetch<{ data: ToolsetApiEntity[] }>("/openai/toolsets");
  return res.data.map(mapApiToDialToolset);
}

export interface DialFileMetadataItem {
  name: string;
  bucket?: string;
  parentPath?: string | null;
  contentType?: string;
  contentLength?: number;
  nodeType: "ITEM" | "FOLDER";
  items?: DialFileMetadataItem[];
}

export async function fetchDialFiles(
  path = "files",
): Promise<DialFileMetadataItem[]> {
  const res = await dialFetch<{ items?: DialFileMetadataItem[] }>(
    `/v1/metadata/${path}?limit=1000&recursive=true`,
  );
  return res.items ?? [];
}
