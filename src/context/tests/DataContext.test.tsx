import { act, type FC } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DataContextProvider, useDataContext } from '@/context/DataContext';
import {
  type DialModel,
  type DialSkill,
  type DialToolset,
  DialEntityType,
  ToolsetAuthStatus,
  ToolsetAuthType,
} from '@/types/dial-entities';
import { LoadStatus } from '@/types/load-status';

const HOST = 'https://host';

const { fetchers } = vi.hoisted(() => ({
  fetchers: {
    fetchDialModels: vi.fn(),
    fetchDialToolsets: vi.fn(),
    fetchDialMcpAgents: vi.fn(),
    fetchDialSkills: vi.fn(),
    fetchFavoriteIds: vi.fn(),
  },
}));

vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ isReady: true, settings: { allowedOrigins: [HOST] } }),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({ user: { bucket: 'b' } }),
}));
vi.mock('@/utils/dial-client', () => ({
  fetchDialModels: fetchers.fetchDialModels,
  fetchDialToolsets: fetchers.fetchDialToolsets,
  fetchDialMcpAgents: fetchers.fetchDialMcpAgents,
  fetchDialSkills: fetchers.fetchDialSkills,
}));
vi.mock('@/utils/user-config', () => ({ fetchFavoriteIds: fetchers.fetchFavoriteIds }));

const FIGMA: DialToolset = {
  id: 'toolsets/public/figma',
  reference: 'toolsets/public/figma',
  name: 'Figma',
  type: DialEntityType.Toolset,
  authSettings: {
    authenticationType: ToolsetAuthType.OAuth,
    authStatus: ToolsetAuthStatus.SignedOut,
  },
};

const SIGNED_IN_FIGMA: DialToolset = {
  ...FIGMA,
  authSettings: {
    authenticationType: ToolsetAuthType.OAuth,
    authStatus: ToolsetAuthStatus.SignedIn,
  },
};

const GPT: DialModel = {
  id: 'gpt-4o',
  reference: 'gpt-4o',
  name: 'GPT-4o',
  type: DialEntityType.Model,
  features: { tools: true },
};

const MCP_ONLY_AGENT: DialModel = {
  id: 'applications/b/mcp-agent',
  reference: 'applications/b/mcp-agent',
  name: 'MCP agent',
  type: DialEntityType.Application,
};

const SKILL: DialSkill = {
  id: 'skills/b/summarize',
  reference: 'skills/b/summarize',
  name: 'Summarize',
  type: DialEntityType.Skill,
};

let latest: ReturnType<typeof useDataContext>;
let root: Root;
let container: HTMLDivElement;

const Probe: FC = () => {
  latest = useDataContext();
  return null;
};

const render = async () => {
  await act(async () =>
    root.render(
      <DataContextProvider>
        <Probe />
      </DataContextProvider>,
    ),
  );
};

const postFromHost = async (data: unknown, origin = HOST) => {
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data, origin }));
  });
};

const loginResult = (overrides: Record<string, unknown> = {}) => ({
  type: 'TOOLSET_LOGIN_RESULT',
  toolsetId: FIGMA.id,
  success: true,
  ...overrides,
});

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  fetchers.fetchDialModels.mockResolvedValue([GPT]);
  fetchers.fetchDialToolsets.mockResolvedValue([FIGMA]);
  fetchers.fetchDialMcpAgents.mockResolvedValue([]);
  fetchers.fetchDialSkills.mockResolvedValue([SKILL]);
  fetchers.fetchFavoriteIds.mockResolvedValue(new Set<string>());
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('DataContext — initial load', () => {
  it('loads models, toolsets, skills and favorites once the app is ready', async () => {
    fetchers.fetchFavoriteIds.mockResolvedValue(new Set([GPT.id, FIGMA.id]));

    await render();

    expect(latest.status).toBe(LoadStatus.Ready);
    expect(latest.models).toEqual([GPT]);
    expect(latest.modelsMap).toEqual({ [GPT.id]: GPT });
    expect(latest.toolsetsMap).toEqual({ [FIGMA.id]: FIGMA });
    expect(latest.skills).toEqual([SKILL]);
    expect(latest.userBucket).toBe('b');
    expect(latest.favoritesError).toBeUndefined();
    expect(latest.modelsWithFavorites[0]).toMatchObject({ isUserFavorite: true, isStarred: true });
    expect(latest.toolsetsWithFavorites[0]).toMatchObject({
      isUserFavorite: true,
      isStarred: true,
    });
    expect(latest.skillsWithFavorites[0]).toMatchObject({
      isUserFavorite: false,
      isStarred: false,
    });
  });

  it('marks a chat model that is also an MCP agent as MCP and keeps only MCP-only agents', async () => {
    const gptAsAgent: DialModel = { ...MCP_ONLY_AGENT, id: GPT.id, reference: GPT.id };
    const figmaAsAgent: DialModel = { ...MCP_ONLY_AGENT, id: FIGMA.id, reference: FIGMA.id };
    fetchers.fetchDialMcpAgents.mockResolvedValue([gptAsAgent, figmaAsAgent, MCP_ONLY_AGENT]);

    await render();

    expect(latest.models).toEqual([{ ...GPT, mcp: true, features: { tools: true, mcp: true } }]);
    expect(latest.mcpAgents).toEqual([MCP_ONLY_AGENT]);
    expect(latest.mcpAgentsMap).toEqual({ [MCP_ONLY_AGENT.id]: MCP_ONLY_AGENT });
  });

  it('still becomes ready with the catalog when favorites fail, holding the error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchers.fetchFavoriteIds.mockRejectedValue(new Error('user-config 500'));

    await render();

    expect(latest.status).toBe(LoadStatus.Ready);
    expect(latest.models).toEqual([GPT]);
    expect(latest.favoriteIds.size).toBe(0);
    expect(latest.favoritesError).toBe('user-config 500');
  });
});

describe('DataContext — unsolicited host login results', () => {
  it('signs a known toolset in from a host-initiated login result without refetching the list', async () => {
    await render();

    await postFromHost(loginResult());

    expect(latest.toolsets).toEqual([SIGNED_IN_FIGMA]);
    expect(latest.toolsetsMap[FIGMA.id]).toEqual(SIGNED_IN_FIGMA);
    expect(fetchers.fetchDialToolsets).toHaveBeenCalledTimes(1);
  });

  it('leaves the state unchanged for a login result about a toolset not in the list', async () => {
    await render();
    const { toolsets, toolsetsMap } = latest;

    await postFromHost(loginResult({ toolsetId: 'toolsets/public/unknown' }));

    expect(latest.toolsets).toBe(toolsets);
    expect(latest.toolsetsMap).toBe(toolsetsMap);
  });

  it('does not apply a logout result nobody requested', async () => {
    fetchers.fetchDialToolsets.mockResolvedValue([SIGNED_IN_FIGMA]);
    await render();

    await postFromHost({ type: 'TOOLSET_LOGOUT_RESULT', toolsetId: FIGMA.id, success: true });

    expect(latest.toolsetsMap[FIGMA.id]).toEqual(SIGNED_IN_FIGMA);
  });

  it('ignores a login result from an origin that is not allowed', async () => {
    await render();

    await postFromHost(loginResult(), 'https://evil');

    expect(latest.toolsetsMap[FIGMA.id]).toEqual(FIGMA);
  });

  it('ignores a failed login result', async () => {
    await render();

    await postFromHost(loginResult({ success: false, reason: 'access_denied' }));

    expect(latest.toolsetsMap[FIGMA.id]).toEqual(FIGMA);
  });

  it('ignores a login result without a toolset id', async () => {
    await render();

    await postFromHost(loginResult({ toolsetId: undefined }));
    await postFromHost(loginResult({ toolsetId: '' }));

    expect(latest.toolsetsMap[FIGMA.id]).toEqual(FIGMA);
  });
});
