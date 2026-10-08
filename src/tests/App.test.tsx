import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStatus } from '@/types/auth';

const mocks = vi.hoisted(() => ({
  connectorCtor: vi.fn(),
  sendReady: vi.fn(),
  sendReadyToInteract: vi.fn(),
  destroy: vi.fn(),
  fetchAppSettings: vi.fn(),
  authState: { status: 'authenticated', user: undefined as unknown, logout: vi.fn() },
  onReadyToSave: undefined as (() => void) | undefined,
}));

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
vi.mock('@/context/AuthContext', () => ({ useAuthContext: () => mocks.authState }));
vi.mock('@/utils/auth-api', () => ({ getAuthProviders: () => Promise.resolve([]) }));
vi.mock('@/utils/dial-client', () => ({ fetchAppSettings: mocks.fetchAppSettings }));
vi.mock('@/components/EditorClient/EditorClient', () => ({
  default: ({ onReadyToSave }: { onReadyToSave?: () => void }) => {
    mocks.onReadyToSave = onReadyToSave;
    return null;
  },
}));
vi.mock('@/components/AuthError/AuthError', () => ({ default: () => null }));
vi.mock('@/components/FullScreenSpinner/FullScreenSpinner', () => ({ default: () => null }));
vi.mock('@/components/LoginScreen/LoginScreen', () => ({ default: () => null }));

import App from '@/App';

const HOST = 'https://chat.example.com';

let root: Root;
let container: HTMLDivElement;
let postMessage: ReturnType<typeof vi.spyOn>;

const renderApp = async (search: string) => {
  window.history.replaceState(null, '', `/${search}`);
  await act(async () => root.render(<App />));
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.authState.status = AuthStatus.Authenticated;
  mocks.fetchAppSettings.mockResolvedValue({ dialChatHost: HOST });
  postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
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

  it('uses each load\'s own name for the same deployment', async () => {
    await renderApp('?applicationName=A');
    act(() => root.unmount());
    root = createRoot(container);
    await renderApp('?applicationName=B');

    expect(mocks.connectorCtor.mock.calls.map((c) => c[1])).toEqual(['A', 'B']);
  });

  it.each(['', '?applicationName='])('does not create the connector without a name (%j)', async (search) => {
    await renderApp(search);

    expect(mocks.connectorCtor).not.toHaveBeenCalled();
    expect(mocks.sendReady).not.toHaveBeenCalled();
  });

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
