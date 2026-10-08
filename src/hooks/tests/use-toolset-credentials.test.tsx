import { act, type FC } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useToolsetCredentials,
  type UseToolsetCredentialsResult,
} from '@/hooks/use-toolset-credentials';
import { DialEntityType } from '@/types/dial-entities';
import { type DialToolset, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';

const HOST = 'https://host';

const { postToHost, toolsetsApi, dataContext } = vi.hoisted(() => ({
  postToHost: vi.fn(),
  toolsetsApi: { loginToolset: vi.fn(), logoutToolset: vi.fn() },
  dataContext: { applyToolsetAuthResult: vi.fn(), refreshToolsets: vi.fn() },
}));

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/context/AppContext', () => ({
  useAppContext: () => ({ settings: { allowedOrigins: [HOST] } }),
}));
vi.mock('@/context/DataContext', () => ({ useDataContext: () => dataContext }));
vi.mock('@/utils/allowed-origins', () => ({
  postToHost,
  isOriginAllowed: (origin: string, allowed: string[] = []) => allowed.includes(origin),
}));
vi.mock('@/utils/chat-api-client', () => ({ toolsetsApi }));
vi.mock('@/utils/dial-client', () => ({ encodeDialPath: (id: string) => id }));

const OAUTH: DialToolset = {
  id: 'toolsets/public/figma',
  reference: 'toolsets/public/figma',
  name: 'Figma',
  type: DialEntityType.Toolset,
  authSettings: {
    authenticationType: ToolsetAuthType.OAuth,
    authStatus: ToolsetAuthStatus.SignedOut,
  },
};

// Not under `toolsets/public/`, so it signs in for the whole workspace.
const PRIVATE_API_KEY: DialToolset = {
  ...OAUTH,
  id: 'toolsets/user-bucket/jira',
  authSettings: {
    authenticationType: ToolsetAuthType.ApiKey,
    authStatus: ToolsetAuthStatus.SignedOut,
  },
};

let latest: UseToolsetCredentialsResult;
let root: Root;
let container: HTMLDivElement;

const Probe: FC<{ toolset?: DialToolset }> = ({ toolset }) => {
  latest = useToolsetCredentials(toolset);
  return null;
};

const render = async (toolset?: DialToolset) => {
  await act(async () => root.render(<Probe toolset={toolset} />));
};

const postFromHost = async (data: unknown, origin = HOST) => {
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data, origin }));
  });
};

/** Starts an action and returns whether its promise has settled after the given step. */
const track = (promise: Promise<void>) => {
  const state = { isSettled: false };
  void promise.then(() => (state.isSettled = true));
  return state;
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useToolsetCredentials — OAuth through the host', () => {
  it('posts the login request and settles on the matching success', async () => {
    await render(OAUTH);

    let login = { isSettled: false };
    await act(async () => {
      login = track(latest.onLogin({}));
    });

    expect(postToHost).toHaveBeenCalledWith(
      { type: 'REQUEST_TOOLSET_LOGIN', toolsetId: OAUTH.id },
      [HOST],
    );
    expect(login.isSettled).toBe(false);

    await postFromHost({ type: 'TOOLSET_LOGIN_RESULT', toolsetId: OAUTH.id, success: true });

    expect(login.isSettled).toBe(true);
    expect(dataContext.applyToolsetAuthResult).toHaveBeenCalledWith(
      expect.objectContaining({ toolsetId: OAUTH.id }),
      ToolsetAuthStatus.SignedIn,
    );
  });

  it('settles on a failed result without rejecting or changing the status', async () => {
    await render(OAUTH);

    let login = { isSettled: false };
    await act(async () => {
      login = track(latest.onLogin({}));
    });
    await postFromHost({ type: 'TOOLSET_LOGIN_RESULT', toolsetId: OAUTH.id, success: false });

    expect(login.isSettled).toBe(true);
    expect(dataContext.applyToolsetAuthResult).not.toHaveBeenCalled();
  });

  it('ignores results from other origins, for other toolsets or of another kind', async () => {
    await render(OAUTH);

    let login = { isSettled: false };
    await act(async () => {
      login = track(latest.onLogin({}));
    });
    await postFromHost(
      { type: 'TOOLSET_LOGIN_RESULT', toolsetId: OAUTH.id, success: true },
      'https://evil',
    );
    await postFromHost({ type: 'TOOLSET_LOGIN_RESULT', toolsetId: 'toolsets/x', success: true });
    await postFromHost({ type: 'TOOLSET_LOGOUT_RESULT', toolsetId: OAUTH.id, success: true });

    expect(login.isSettled).toBe(false);
    expect(dataContext.applyToolsetAuthResult).not.toHaveBeenCalled();
  });

  it('logs out through the host', async () => {
    await render(OAUTH);

    await act(async () => {
      void latest.onLogout();
    });
    await postFromHost({ type: 'TOOLSET_LOGOUT_RESULT', toolsetId: OAUTH.id, success: true });

    expect(postToHost).toHaveBeenCalledWith(
      { type: 'REQUEST_TOOLSET_LOGOUT', toolsetId: OAUTH.id },
      [HOST],
    );
    expect(dataContext.applyToolsetAuthResult).toHaveBeenCalledWith(
      expect.anything(),
      ToolsetAuthStatus.SignedOut,
    );
  });
});

describe('useToolsetCredentials — API key through chat-api', () => {
  it('adds the key at the workspace level for a private toolset and refreshes', async () => {
    toolsetsApi.loginToolset.mockResolvedValue({});
    await render(PRIVATE_API_KEY);

    await act(async () => latest.onLogin({ apiKey: 'secret' }));

    expect(postToHost).not.toHaveBeenCalled();
    expect(toolsetsApi.loginToolset).toHaveBeenCalledWith({
      toolsetName: PRIVATE_API_KEY.id,
      toolsetLoginBodyDto: {
        url: PRIVATE_API_KEY.id,
        credentialsLevel: 'GLOBAL',
        authenticationType: 'API_KEY',
        apiKey: 'secret',
      },
    });
    expect(dataContext.refreshToolsets).toHaveBeenCalled();
  });

  it('deletes the key', async () => {
    toolsetsApi.logoutToolset.mockResolvedValue({});
    await render(PRIVATE_API_KEY);

    await act(async () => latest.onLogout());

    expect(toolsetsApi.logoutToolset).toHaveBeenCalledWith({
      toolsetName: PRIVATE_API_KEY.id,
      toolsetLogoutBodyDto: {
        url: PRIVATE_API_KEY.id,
        credentialsLevel: 'GLOBAL',
        authenticationType: 'API_KEY',
      },
    });
  });

  it('resolves on a failed request and leaves the status unchanged', async () => {
    toolsetsApi.loginToolset.mockRejectedValue(new Error('401'));
    await render(PRIVATE_API_KEY);

    await act(async () => latest.onLogin({ apiKey: 'wrong' }));

    expect(dataContext.refreshToolsets).not.toHaveBeenCalled();
  });
});
