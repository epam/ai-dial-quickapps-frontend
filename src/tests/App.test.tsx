import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';
import { AuthStatus } from '@/types/auth';

const mocks = vi.hoisted(() => ({
  connectorCtor: vi.fn(),
  sendReady: vi.fn(),
  sendReadyToInteract: vi.fn(),
  destroy: vi.fn(),
  fetchAppSettings: vi.fn(),
  authState: { status: 'authenticated', user: undefined as unknown, logout: vi.fn() },
  onReadyToSave: undefined as (() => void) | undefined,
  editorSettings: undefined as unknown,
  authListeners: new Set<() => void>(),
}));

// Replaces the auth snapshot and re-renders its subscribers, as AuthContext does.
const setAuth = async (next: Partial<typeof mocks.authState>) => {
  mocks.authState = { ...mocks.authState, ...next };
  await act(async () => mocks.authListeners.forEach((listener) => listener()));
};

vi.mock('@epam/ai-dial-chat-visualizer-connector', () => ({
  ChatVisualizerConnector: class {
    constructor(...args: unknown[]) {
      mocks.connectorCtor(...args);
    }
    sendReady = mocks.sendReady;
    sendReadyToInteract = mocks.sendReadyToInteract;
    destroy = mocks.destroy;
  },
}));
vi.mock('@/context/AuthContext', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => {
    mocks.authListeners.add(listener);
    return () => mocks.authListeners.delete(listener);
  };
  return {
    useAuthContext: () => useSyncExternalStore(subscribe, () => mocks.authState),
  };
});
vi.mock('@/utils/auth-api', () => ({ getAuthProviders: () => Promise.resolve([]) }));
vi.mock('@/utils/dial-client', () => ({ fetchAppSettings: mocks.fetchAppSettings }));
vi.mock('@/components/EditorClient/EditorClient', () => ({
  default: ({ settings, onReadyToSave }: { settings: unknown; onReadyToSave?: () => void }) => {
    mocks.onReadyToSave = onReadyToSave;
    mocks.editorSettings = settings;
    return null;
  },
}));
vi.mock('@/components/AuthError/AuthError', () => ({ default: () => null }));
vi.mock('@/components/FullScreenSpinner/FullScreenSpinner', () => ({ default: () => null }));
vi.mock('@/components/LoginScreen/LoginScreen', () => ({ default: () => null }));

import App from '@/App';

const HOST = 'https://chat.example.com';

const dom = setupTestRoot();
let postMessage: ReturnType<typeof vi.spyOn>;

const renderApp = async (search: string) => {
  window.history.replaceState(null, '', `/${search}`);
  await act(async () => dom.root.render(<App />));
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authState = { status: AuthStatus.Authenticated, user: undefined, logout: vi.fn() };
  mocks.editorSettings = undefined;
  mocks.fetchAppSettings.mockResolvedValue({ dialChatHost: HOST });
  postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
});

afterEach(() => {
  postMessage.mockRestore();
  window.history.replaceState(null, '', '/');
});

describe('App host connector', () => {
  it('creates the connector with the applicationName from the entry URL', async () => {
    await renderApp('?applicationName=Quick%20app%202.0');

    expect(mocks.connectorCtor).toHaveBeenCalledTimes(1);
    expect(mocks.connectorCtor.mock.calls[0].slice(0, 2)).toEqual([HOST, 'Quick app 2.0']);
    expect(mocks.sendReady).toHaveBeenCalledTimes(1);
    expect(mocks.sendReadyToInteract).toHaveBeenCalledTimes(1);
  });

  it("uses each load's own name for the same deployment", async () => {
    await renderApp('?applicationName=A');
    dom.render(null);
    await renderApp('?applicationName=B');

    expect(mocks.connectorCtor.mock.calls.map((c) => c[1])).toEqual(['A', 'B']);
  });

  it.each(['', '?applicationName='])(
    'does not create the connector without a name (%j)',
    async (search) => {
      await renderApp(search);

      expect(mocks.connectorCtor).not.toHaveBeenCalled();
      expect(mocks.sendReady).not.toHaveBeenCalled();
    },
  );

  it('prefixes readyToSave with the name from the URL', async () => {
    await renderApp('?applicationName=X');
    await act(async () => mocks.onReadyToSave?.());

    expect(postMessage).toHaveBeenCalledWith({ type: 'X/readyToSave' }, HOST);
  });

  it('prefixes loggedOut with the name from the URL', async () => {
    mocks.authState.status = AuthStatus.Unauthenticated;
    await renderApp('?applicationName=X&authProvider=p');

    expect(postMessage).toHaveBeenCalledWith({ type: 'X/loggedOut' }, HOST);
  });

  it('sends no plain messages without a name', async () => {
    await renderApp('');
    await act(async () => mocks.onReadyToSave?.());

    expect(postMessage).not.toHaveBeenCalled();
  });
});

describe('App settings', () => {
  it('waits for the auth status before requesting the client config', async () => {
    mocks.authState.status = AuthStatus.Loading;
    await renderApp('?applicationName=X');

    expect(mocks.fetchAppSettings).not.toHaveBeenCalled();
  });

  it('requests the client config once per session user and passes it to the editor', async () => {
    const settings = { dialChatHost: HOST, allowedOrigins: [HOST] };
    mocks.fetchAppSettings.mockResolvedValue(settings);
    mocks.authState.user = { sub: 'u1' };
    await renderApp('?applicationName=X');

    // A same-user session revalidation hands out a new user object.
    await setAuth({ user: { sub: 'u1' } });

    expect(mocks.fetchAppSettings).toHaveBeenCalledTimes(1);
    expect(mocks.editorSettings).toBe(settings);
  });

  it("reloads the client config on sign-in and renders the editor with the user's copy", async () => {
    const anonymous = { dialChatHost: HOST };
    const signedIn = { dialChatHost: HOST, isWebFetchEnabled: true };
    mocks.fetchAppSettings.mockResolvedValueOnce(anonymous).mockResolvedValueOnce(signedIn);
    mocks.authState.status = AuthStatus.Unauthenticated;
    await renderApp('?applicationName=X&authProvider=p');

    await setAuth({ status: AuthStatus.Authenticated, user: { sub: 'u1' } });

    expect(mocks.fetchAppSettings).toHaveBeenCalledTimes(2);
    expect(mocks.editorSettings).toBe(signedIn);
  });

  it('does not repeat the handshake when sign-in keeps the same host keys', async () => {
    mocks.authState.status = AuthStatus.Unauthenticated;
    await renderApp('?applicationName=X&authProvider=p');

    await setAuth({ status: AuthStatus.Authenticated, user: { sub: 'u1' } });

    expect(mocks.connectorCtor).toHaveBeenCalledTimes(1);
    expect(mocks.sendReady).toHaveBeenCalledTimes(1);
  });
});
