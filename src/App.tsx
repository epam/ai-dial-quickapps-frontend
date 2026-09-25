import { ChatVisualizerConnector } from '@epam/ai-dial-chat-visualizer-connector';
import { FC, memo, Suspense, useEffect, useRef, useState } from 'react';

import AuthError from '@/components/AuthError/AuthError';
import EditorClient from '@/components/EditorClient/EditorClient';
import LoadingScreen from '@/components/LoadingScreen/LoadingScreen';
import LoginPrompt from '@/components/LoginPrompt/LoginPrompt';
import { useAuthContext } from '@/context/AuthContext';
import { useSearchParams } from '@/hooks/useSearchParams';
import { AuthProviderInfo, AuthStatus } from '@/types/auth';
import { AppSettings } from '@/types/dial-entities';
import { getAuthProviders } from '@/utils/auth-api';
import { fetchAppSettings } from '@/utils/dialClient';

const HomePageContent: FC = () => {
  const searchParams = useSearchParams();
  const provider = searchParams.get('authProvider') ?? undefined;
  const { status, user, logout } = useAuthContext();
  const [providers, setProviders] = useState<AuthProviderInfo[] | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const chatVisualizerConnector = useRef<ChatVisualizerConnector | null>(null);
  const connectorTargetRef = useRef<{ host: string; applicationName: string } | null>(null);

  useEffect(() => {
    void getAuthProviders().then(setProviders);
  }, []);

  useEffect(() => {
    if (user?.providerId && provider && user.providerId !== provider) {
      void logout();
    }
  }, [user, provider, logout]);

  useEffect(() => {
    void fetchAppSettings().then((s) => {
      setSettings(s);
    });
  }, []);

  useEffect(() => {
    const { dialAdminHost, dialChatHost, applicationName } = settings ?? {};
    if (chatVisualizerConnector.current) return;
    if (!settings) return;
    if (!(dialAdminHost || dialChatHost) || !applicationName) {
      return;
    }

    // `??` would treat an explicitly-empty `dialAdminHost` (e.g. unset in
    // CUSTOM_CLIENT_VARIABLES) as "present", leaving `host` as '' and
    // breaking postMessage's target-origin validation — `||` correctly
    // falls through to `dialChatHost` for that case too.
    let host = dialAdminHost || dialChatHost;
    if (dialChatHost && dialChatHost === document.location.ancestorOrigins?.[0]) {
      host = dialChatHost;
    }
    chatVisualizerConnector.current = new ChatVisualizerConnector(
      host as string,
      applicationName,
      () => {},
    );
    connectorTargetRef.current = { host: host as string, applicationName };
    chatVisualizerConnector.current.sendReady();
    chatVisualizerConnector.current.sendReadyToInteract();

    return () => {
      chatVisualizerConnector.current?.destroy();
      chatVisualizerConnector.current = null;
      connectorTargetRef.current = null;
    };
  }, [settings]);

  // Sent once the editor's own model state has finished loading and is safe
  // to save. Mirrors the same host/appName targeting as sendReadyToInteract,
  // but posts directly since `readyToSave` isn't part of the connector's
  // typed event set.
  //
  // The model can finish loading before the connector (which waits on
  // `settings`) exists, so this can't fire-and-forget on model-ready alone —
  // it re-checks whenever either the model becomes ready or the connector
  // target becomes available, whichever happens second.
  useEffect(() => {
    if (!isModelReady) return;
    const target = connectorTargetRef.current;
    if (!target) {
      return;
    }
    window.parent.postMessage({ type: `${target.applicationName}/readyToSave` }, target.host);
  }, [isModelReady, settings]);

  // Sent when the user is signed out (session ended or errored) so the host
  // knows to show its own logged-out handling instead of an idle iframe.
  // Uses the same manual-postMessage approach as readyToSave above, for the
  // same reason: it isn't part of the connector's typed event set.
  useEffect(() => {
    if (status !== AuthStatus.Unauthenticated) return;
    const target = connectorTargetRef.current;
    if (!target) {
      return;
    }
    window.parent.postMessage({ type: `${target.applicationName}/loggedOut` }, target.host);
  }, [status, settings]);

  const handleReadyToSave = () => {
    setIsModelReady(true);
  };

  const hasProviderMismatch = Boolean(user?.providerId && provider && user.providerId !== provider);

  if (status === AuthStatus.Loading || hasProviderMismatch) {
    return <LoadingScreen />;
  }

  if (status === AuthStatus.Authenticated) {
    return <EditorClient onReadyToSave={handleReadyToSave} />;
  }

  if (provider == null) {
    return <AuthError message="No auth provider specified for this app" />;
  }

  if (providers == null) {
    return <LoadingScreen />;
  }

  if (!providers.some((p) => p.id === provider)) {
    return <AuthError message={`Auth provider ${provider} is not configured for this app`} />;
  }

  return <LoginPrompt provider={provider} />;
};

const HomePage: FC = () => (
  <Suspense>
    <HomePageContent />
  </Suspense>
);

export default memo(HomePage);
