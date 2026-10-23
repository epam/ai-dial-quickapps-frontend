import { AppsEditorClient, ChatVisualizerConnector } from '@epam/ai-dial-visualizer-connector';
import { FC, memo, Suspense, useCallback, useEffect, useState } from 'react';

import AuthError from '@/components/AuthError/AuthError';
import EditorClient from '@/components/EditorClient/EditorClient';
import FullScreenSpinner from '@/components/FullScreenSpinner/FullScreenSpinner';
import LoginScreen from '@/components/LoginScreen/LoginScreen';
import { useAuthContext } from '@/context/AuthContext';
import { useSearchParams } from '@/hooks/use-search-params';
import { AuthErrorReason, AuthProviderInfo, AuthStatus } from '@/types/auth';
import { AppSettings } from '@/types/dial-entities';
import { getAuthProviders } from '@/utils/auth-api';
import { fetchAppSettings } from '@/utils/dial-client';
import { getEditorHostOrigin } from '@/utils/get-editor-host-origin';

// The settings and the user they were loaded for (`null` = signed out).
interface LoadedSettings {
  userSub: string | null;
  settings: AppSettings;
}

interface AuthenticatedEditorProps {
  settings: AppSettings;
  client: AppsEditorClient | null;
}

// Readiness belongs to this mounted editor, not to a user id that can log in again.
const AuthenticatedEditor: FC<AuthenticatedEditorProps> = ({ settings, client }) => {
  const [isModelReady, setIsModelReady] = useState(false);
  const handleReadyToSave = useCallback(() => setIsModelReady(true), []);

  useEffect(() => {
    if (isModelReady) client?.sendReadyToSave();
  }, [isModelReady, client]);

  return <EditorClient settings={settings} onReadyToSave={handleReadyToSave} />;
};

const HomePageContent: FC = () => {
  const searchParams = useSearchParams();
  const provider = searchParams.get('authProvider') ?? undefined;
  const applicationName = searchParams.get('applicationName') || undefined;
  const { status, user, logout } = useAuthContext();
  const [providers, setProviders] = useState<AuthProviderInfo[] | null>(null);
  const [loadedSettings, setLoadedSettings] = useState<LoadedSettings | null>(null);
  const [editorClient, setEditorClient] = useState<AppsEditorClient | null>(null);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setProviders(await getAuthProviders());
      } catch (err: unknown) {
        // Providers stay unknown, so the spinner keeps showing, as before.
        console.error('[App] failed to load auth providers:', err);
      }
    };
    void loadProviders();
  }, []);

  useEffect(() => {
    if (user?.providerId && provider && user.providerId !== provider) {
      void logout();
    }
  }, [user, provider, logout]);

  // The only client-config request. chat-api resolves role-restricted values for
  // the session user, so it waits for the auth status and reloads only when the
  // user changes — not on a same-user session revalidation.
  const isAuthResolved = status !== AuthStatus.Loading;
  const userSub = user?.sub ?? null;
  useEffect(() => {
    if (!isAuthResolved) return;
    let isActive = true;
    // fetchAppSettings never rejects: a failed load resolves to `{}`.
    const loadSettings = async () => {
      const settings = await fetchAppSettings();
      if (isActive) setLoadedSettings({ userSub, settings });
    };
    void loadSettings();
    return () => {
      isActive = false;
    };
  }, [isAuthResolved, userSub]);

  // Keyed on the host keys, not the settings object, so reloading the settings
  // after sign-in does not repeat the handshake.
  const { dialAdminHost, dialChatHost } = loadedSettings?.settings ?? {};
  const hostOrigin = getEditorHostOrigin(
    { dialAdminHost, dialChatHost },
    document.location.ancestorOrigins?.[0],
  );
  useEffect(() => {
    if (!hostOrigin || !applicationName) {
      setEditorClient(null);
      return;
    }

    const client = new AppsEditorClient({ hostOrigin, applicationName });
    const visualizer = new ChatVisualizerConnector(hostOrigin, applicationName, () => {});
    visualizer.sendReady();
    visualizer.sendReadyToInteract();
    client.sendReadyToInteract();
    setEditorClient(client);

    return () => {
      client.destroy();
      visualizer.destroy();
    };
  }, [hostOrigin, applicationName]);

  // Sent when the user is signed out (session ended or errored) so the host
  // knows to show its own logged-out handling instead of an idle iframe.
  useEffect(() => {
    if (status === AuthStatus.Unauthenticated) editorClient?.sendLoggedOut();
  }, [status, editorClient]);

  const hasProviderMismatch = Boolean(user?.providerId && provider && user.providerId !== provider);

  if (status === AuthStatus.Loading || hasProviderMismatch) {
    return <FullScreenSpinner />;
  }

  if (status === AuthStatus.Authenticated) {
    // Settings loaded while signed out (or for another user) are not this user's.
    if (loadedSettings?.userSub !== userSub) return <FullScreenSpinner />;
    return (
      <AuthenticatedEditor key={userSub} settings={loadedSettings.settings} client={editorClient} />
    );
  }

  if (provider == null) {
    return <AuthError reason={AuthErrorReason.NoProvider} />;
  }

  if (providers == null) {
    return <FullScreenSpinner />;
  }

  if (!providers.some((p) => p.id === provider)) {
    return <AuthError reason={AuthErrorReason.ProviderNotConfigured} provider={provider} />;
  }

  return <LoginScreen provider={provider} />;
};

const HomePage: FC = () => (
  <Suspense>
    <HomePageContent />
  </Suspense>
);

export default memo(HomePage);
