'use client';

import { ChatVisualizerConnector } from '@epam/ai-dial-chat-visualizer-connector';
import { DialLoader } from '@epam/ai-dial-ui-kit';
import { ClientSafeProvider, getProviders, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { FC, memo, Suspense, useEffect, useRef, useState } from 'react';

import AuthError from '@/components/AuthError/AuthError';
import EditorClient from '@/components/EditorClient/EditorClient';
import LoginPrompt from '@/components/LoginPrompt/LoginPrompt';
import { AppSettings } from '@/types/dial-entities';
import { fetchAppSettings } from '@/utils/dialClient';

const LoadingScreen: FC = () => (
  <div className="flex h-screen items-center justify-center">
    <DialLoader size={50} />
  </div>
);

const HomePageContent: FC = () => {
  const searchParams = useSearchParams();
  const provider = searchParams.get('authProvider') ?? undefined;
  const { data: session, status } = useSession();
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const chatVisualizerConnector = useRef<ChatVisualizerConnector | null>(null);
  const connectorTargetRef = useRef<{ host: string; applicationName: string } | null>(null);

  useEffect(() => {
    void getProviders().then(setProviders);
  }, []);

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

    let host = dialAdminHost ?? dialChatHost;
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

  const handleReadyToSave = () => {
    setIsModelReady(true);
  };

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (session && !session.error) {
    return <EditorClient onReadyToSave={handleReadyToSave} />;
  }

  if (provider == null) {
    return <AuthError message="No auth provider specified for this app" />;
  }

  if (providers == null) {
    return <LoadingScreen />;
  }

  if (!(provider in providers)) {
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
