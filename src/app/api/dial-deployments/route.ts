import { NextRequest, NextResponse } from 'next/server';

import { errorLog, warnLog } from '@/server/logger';
import { getDialAuth, JSON_CONTENT_TYPE_HEADERS } from '@/utils/server/dial-server-auth';
import { getDialSDK, withAuthHeader } from '@/utils/server/dial-sdk';

type DeploymentInterfaceType = 'chat' | 'embedding' | 'mcp' | 'custom_ui' | 'all';

const DEPLOYMENT_INTERFACE_TYPES: readonly DeploymentInterfaceType[] = [
  'chat',
  'embedding',
  'mcp',
  'custom_ui',
  'all',
];

const isDeploymentInterfaceType = (value: string): value is DeploymentInterfaceType =>
  (DEPLOYMENT_INTERFACE_TYPES as readonly string[]).includes(value);

/**
 * GET /api/dial-deployments
 *
 * Query params:
 *   interfaceType – DIAL Core interface tag to filter by (e.g. 'chat', 'mcp')
 *
 * Calls DIAL Core GET /v1/deployments?interface_type=... to list models,
 * applications and toolsets in one call, scoped to a single interface.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { token, dialApiHost } = await getDialAuth(req);
  if (!token || !dialApiHost) {
    warnLog('dial-deployments: unauthenticated request');
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const interfaceTypeParam = req.nextUrl.searchParams.get('interfaceType');
  if (interfaceTypeParam !== null && !isDeploymentInterfaceType(interfaceTypeParam)) {
    warnLog(`dial-deployments: invalid interfaceType=${interfaceTypeParam}`);
    return NextResponse.json({ error: 'Invalid interfaceType' }, { status: 400 });
  }
  const interfaceType = interfaceTypeParam;

  const sdk = getDialSDK(dialApiHost);
  const { data, error, response } = await sdk.listDeployments({
    ...withAuthHeader(token),
    params: { query: interfaceType ? { interface_type: [interfaceType] } : undefined },
  });

  if (!response.ok) {
    errorLog(`dial-deployments: upstream error ${response.status} for interfaceType=${interfaceType}`);
  }
  return NextResponse.json(data ?? error, {
    status: response.status,
    headers: JSON_CONTENT_TYPE_HEADERS,
  });
}
