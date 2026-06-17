import type { DialModel, DialToolset } from '@/types/dial-entities';

const DIAL_API_VERSION = '2025-01-01-preview';

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

async function dialFetch<T>(
  token: string,
  dialApiHost: string,
  path: string,
): Promise<T> {
  const url = `${dialApiHost}${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
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
    type: entity.object as 'model' | 'application',
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
  const rawId = data.id ?? data.toolset ?? data.name ?? '';
  const id = decodeURIComponent(rawId);
  return {
    id,
    reference: data.reference ?? id,
    name: data.display_name ?? id,
    type: 'toolset',
    version: data.display_version,
    mcp: data.mcp,
    features: data.features,
  };
}

export async function fetchDialModels(
  token: string,
  dialApiHost: string,
): Promise<DialModel[]> {
  const [modelsRes, appsRes] = await Promise.all([
    dialFetch<{ data: CoreApiEntity[] }>(
      token,
      dialApiHost,
      `/openai/models?api-version=${DIAL_API_VERSION}`,
    ),
    dialFetch<{ data: CoreApiEntity[] }>(
      token,
      dialApiHost,
      `/openai/applications?api-version=${DIAL_API_VERSION}`,
    ),
  ]);
  return [...modelsRes.data, ...appsRes.data].map(mapCoreToDialModel);
}

export async function fetchDialToolsets(
  token: string,
  dialApiHost: string,
): Promise<DialToolset[]> {
  const res = await dialFetch<{ data: ToolsetApiEntity[] }>(
    token,
    dialApiHost,
    '/openai/toolsets',
  );
  return res.data.map(mapApiToDialToolset);
}
