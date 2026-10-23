import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { setupTestRoot } from '@/test-utils/test-root';
import { AuthStatus } from '@/types/auth';
import type { AppSettings } from '@/types/dial-entities';

const mocks = vi.hoisted(() => ({
  fetchAppSettings: vi.fn(),
  authState: { status: 'authenticated', user: undefined as unknown, logout: vi.fn() },
  onReadyToSave: undefined as (() => void) | undefined,
  editorSettings: undefined as unknown,
  isReadyOnMount: false,
  authListeners: new Set<() => void>(),
}));

// Replaces the auth snapshot and re-renders its subscribers, as AuthContext does.
const setAuth = async (next: Partial<typeof mocks.authState>) => {
  mocks.authState = { ...mocks.authState, ...next };
  await act(async () => mocks.authListeners.forEach((listener) => listener()));
};

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
interface MockEditorClientProps {
  settings: unknown;
  onReadyToSave?: () => void;
}

vi.mock('@/components/EditorClient/EditorClient', async () => {
  const { useEffect } = await import('react');
  const MockEditorClient = ({ settings, onReadyToSave }: MockEditorClientProps) => {
    mocks.onReadyToSave = onReadyToSave;
    mocks.editorSettings = settings;
    useEffect(() => {
      if (mocks.isReadyOnMount) onReadyToSave?.();
    }, [onReadyToSave]);
    return null;
  };
  return { default: MockEditorClient };
});
vi.mock('@/components/AuthError/AuthError', () => ({ default: () => null }));
vi.mock('@/components/FullScreenSpinner/FullScreenSpinner', () => ({ default: () => null }));
vi.mock('@/components/LoginScreen/LoginScreen', () => ({ default: () => null }));

import App from '@/App';

const HOST = 'https://chat.example.com';

const dom = setupTestRoot();
let postMessage: MockInstance<Window['postMessage']>;

const renderApp = async (search: string) => {
  window.history.replaceState(null, '', `/${search}`);
  await act(async () => dom.root.render(<App />));
};

const messagesOfType = (type: string) =>
  postMessage.mock.calls.filter(([message]) => message.type === type);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authState = { status: AuthStatus.Authenticated, user: undefined, logout: vi.fn() };
  mocks.editorSettings = undefined;
  mocks.onReadyToSave = undefined;
  mocks.isReadyOnMount = false;
  mocks.fetchAppSettings.mockResolvedValue({ dialChatHost: HOST });
  postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('App host connector', () => {
  it('sends both legacy handshake events and typed UI readiness once with the URL name', async () => {
    await renderApp('?applicationName=Quick%20app%202.0');

    expect(postMessage.mock.calls).toEqual([
      [{ type: 'Quick app 2.0/READY', payload: undefined }, HOST],
      [{ type: 'Quick app 2.0/READY_TO_INTERACT', payload: undefined }, HOST],
      [{ type: 'Quick app 2.0/readyToInteract' }, HOST],
    ]);
  });

  it("uses each load's own name for the same deployment", async () => {
    await renderApp('?applicationName=A');
    dom.render(null);
    await renderApp('?applicationName=B');

    expect(messagesOfType('A/readyToInteract')).toHaveLength(1);
    expect(messagesOfType('B/readyToInteract')).toHaveLength(1);
  });

  it.each(['', '?applicationName='])(
    'does not create the connector without a name (%j)',
    async (search) => {
      await renderApp(search);

      expect(postMessage).not.toHaveBeenCalled();
    },
  );

  it('reports save readiness only after the model is ready and once per connection', async () => {
    await renderApp('?applicationName=X');
    expect(messagesOfType('X/readyToSave')).toHaveLength(0);

    await act(async () => mocks.onReadyToSave?.());
    await act(async () => mocks.onReadyToSave?.());

    expect(messagesOfType('X/readyToSave')).toEqual([[{ type: 'X/readyToSave' }, HOST]]);
  });

  it('reports model readiness that arrives before the connection effect completes', async () => {
    mocks.isReadyOnMount = true;
    await renderApp('?applicationName=X');

    expect(messagesOfType('X/readyToSave')).toEqual([[{ type: 'X/readyToSave' }, HOST]]);
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

  it.each([undefined, '', 'not a URL', '*', 'data:text/plain,editor', 'file:///editor'])(
    'renders without a connection for an invalid or missing host: %s',
    async (dialChatHost) => {
      mocks.fetchAppSettings.mockResolvedValue({ dialChatHost });
      await renderApp('?applicationName=X');
      await act(async () => mocks.onReadyToSave?.());

      expect(postMessage).not.toHaveBeenCalled();
      expect(mocks.onReadyToSave).toBeDefined();
    },
  );

  it('targets the normalized host origin', async () => {
    mocks.fetchAppSettings.mockResolvedValue({ dialChatHost: `${HOST}/editor?view=settings` });
    await renderApp('?applicationName=X');
    await act(async () => mocks.onReadyToSave?.());

    for (const [, origin] of postMessage.mock.calls) {
      expect(origin).toBe(HOST);
    }
    expect(messagesOfType('X/readyToSave')).toHaveLength(1);
  });

  it('removes both connector listeners and ignores retired model callbacks on unmount', async () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    await renderApp('?applicationName=X');
    const retiredReady = mocks.onReadyToSave;
    const messageListeners = addListener.mock.calls.filter(([type]) => type === 'message');
    expect(messageListeners).toHaveLength(2);

    dom.render(null);
    postMessage.mockClear();
    await act(async () => retiredReady?.());

    for (const [, listener] of messageListeners) {
      expect(
        removeListener.mock.calls.some(
          ([type, removed]) => type === 'message' && removed === listener,
        ),
      ).toBe(true);
    }
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

    expect(messagesOfType('X/READY')).toHaveLength(1);
    expect(messagesOfType('X/READY_TO_INTERACT')).toHaveLength(1);
    expect(messagesOfType('X/readyToInteract')).toHaveLength(1);
  });
});

describe('App editor session readiness', () => {
  beforeEach(() => {
    mocks.authState.user = { sub: 'u1', providerId: 'p' };
  });

  it('requires fresh model readiness after the same user logs out and signs in', async () => {
    await renderApp('?applicationName=X&authProvider=p');
    const retiredReady = mocks.onReadyToSave;
    await act(async () => retiredReady?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(1);

    await setAuth({ status: AuthStatus.Unauthenticated, user: undefined });
    expect(messagesOfType('X/loggedOut')).toHaveLength(1);
    await act(async () => retiredReady?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(1);

    await setAuth({ status: AuthStatus.Authenticated, user: { sub: 'u1', providerId: 'p' } });
    expect(mocks.onReadyToSave).not.toBe(retiredReady);
    await act(async () => retiredReady?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(1);

    await act(async () => mocks.onReadyToSave?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(2);
    expect(messagesOfType('X/readyToInteract')).toHaveLength(1);
  });

  it('ignores an unready retired editor callback after a loading gate remounts it', async () => {
    await renderApp('?applicationName=X');
    const retiredReady = mocks.onReadyToSave;

    await setAuth({ status: AuthStatus.Loading });
    await act(async () => retiredReady?.());
    await setAuth({ status: AuthStatus.Authenticated });
    await act(async () => retiredReady?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(0);

    await act(async () => mocks.onReadyToSave?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(1);
  });

  it('does not carry readiness to a replacement user while their settings are pending', async () => {
    await renderApp('?applicationName=X');
    const retiredReady = mocks.onReadyToSave;
    await act(async () => retiredReady?.());
    let finishSettings: (settings: AppSettings) => void = () => {};
    mocks.fetchAppSettings.mockImplementationOnce(
      () =>
        new Promise<AppSettings>((resolve) => {
          finishSettings = resolve;
        }),
    );

    await setAuth({ user: { sub: 'u2', providerId: 'p' } });
    await act(async () => retiredReady?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(1);

    await act(async () => finishSettings({ dialChatHost: HOST }));
    await act(async () => retiredReady?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(1);

    await act(async () => mocks.onReadyToSave?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(2);
  });

  it('retires readiness while a mismatched auth provider gates the editor', async () => {
    await renderApp('?applicationName=X&authProvider=p');
    const retiredReady = mocks.onReadyToSave;

    await setAuth({ user: { sub: 'u1', providerId: 'other' } });
    expect(mocks.authState.logout).toHaveBeenCalled();
    await act(async () => retiredReady?.());
    await setAuth({ user: { sub: 'u1', providerId: 'p' } });
    await act(async () => retiredReady?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(0);

    await act(async () => mocks.onReadyToSave?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(1);
  });

  it('does not replay readiness or the handshake on same-user revalidation', async () => {
    await renderApp('?applicationName=X');
    const onReadyToSave = mocks.onReadyToSave;
    await act(async () => onReadyToSave?.());
    postMessage.mockClear();

    await setAuth({ user: { sub: 'u1', providerId: 'p' } });
    await act(async () => mocks.onReadyToSave?.());

    expect(mocks.onReadyToSave).toBe(onReadyToSave);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('replaces the connection when the next session resolves a different host', async () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    await renderApp('?applicationName=X');
    const retiredReady = mocks.onReadyToSave;
    const oldListeners = addListener.mock.calls.filter(([type]) => type === 'message');
    const nextHost = 'https://next-chat.example.com';
    mocks.fetchAppSettings.mockResolvedValue({ dialChatHost: nextHost });

    await setAuth({ user: { sub: 'u2', providerId: 'p' } });
    await act(async () => retiredReady?.());
    expect(messagesOfType('X/readyToSave')).toHaveLength(0);
    for (const [, listener] of oldListeners) {
      expect(
        removeListener.mock.calls.some(
          ([type, removed]) => type === 'message' && removed === listener,
        ),
      ).toBe(true);
    }

    await act(async () => mocks.onReadyToSave?.());
    expect(messagesOfType('X/readyToSave')).toEqual([[{ type: 'X/readyToSave' }, nextHost]]);
    expect(messagesOfType('X/readyToInteract')).toEqual([
      [{ type: 'X/readyToInteract' }, HOST],
      [{ type: 'X/readyToInteract' }, nextHost],
    ]);
  });
});
