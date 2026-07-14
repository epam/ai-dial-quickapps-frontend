'use client';

import { FC, memo, Suspense, useEffect, useState } from 'react';
import { ClientSafeProvider, getProviders, signIn, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

import AuthError from '@/components/AuthError/AuthError';
import { AUTH_WINDOW_CLOSE_KEY } from '@/constants/auth';

const SignInContent: FC = () => {
  const searchParams = useSearchParams();
  const provider = searchParams.get('authProvider');
  const { data: session, status } = useSession();
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);

  useEffect(() => {
    void getProviders().then(setProviders);
  }, []);

  const isProviderConfigured = provider != null && providers != null && provider in providers;

  useEffect(() => {
    if (!isProviderConfigured) return;

    if (status === 'unauthenticated' || session?.error) {
      void signIn(provider, {
        callbackUrl: `/signin?authProvider=${encodeURIComponent(provider)}`,
      });
    } else if (status === 'authenticated') {
      window.opener?.postMessage({ type: AUTH_WINDOW_CLOSE_KEY }, window.location.origin);
      window.close();
    }
  }, [status, session, provider, isProviderConfigured]);

  if (providers == null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-secondary">Signing in…</p>
      </div>
    );
  }

  if (provider == null) {
    return <AuthError message="No auth provider specified for this app" />;
  }

  if (!isProviderConfigured) {
    return <AuthError message={`Auth provider ${provider} is not configured for this app`} />;
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-secondary">Signing in…</p>
    </div>
  );
};

const SignInPage: FC = () => (
  <Suspense>
    <SignInContent />
  </Suspense>
);

export default memo(SignInPage);
