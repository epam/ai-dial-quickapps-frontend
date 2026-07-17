import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AUTH_WINDOW_CLOSE_KEY } from '@/constants/auth';

const AUTH_WINDOW_POLL_INTERVAL_MS = 500;

export const useAuth = (provider: string) => {
  const { data: session, status: sessionStatus } = useSession();
  const authWindowRef = useRef<Window | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const hasHandledCloseRef = useRef(false);

  const handleAuthWindowClose = useCallback(() => {
    if (hasHandledCloseRef.current) return;
    hasHandledCloseRef.current = true;
    setIsWindowOpen(false);
    window.location.reload();
  }, []);

  const openLoginWindow = useCallback(() => {
    if (isWindowOpen) return;
    hasHandledCloseRef.current = false;
    setIsWindowOpen(true);
    const authWindow = window.open(
      `/signin?authProvider=${encodeURIComponent(provider)}`,
      '_blank',
      'width=600,height=600',
    );
    authWindowRef.current = authWindow;
    if (!authWindow) {
      setIsWindowOpen(false);
    }
  }, [isWindowOpen, provider]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if ((event.data as { type?: string })?.type === AUTH_WINDOW_CLOSE_KEY) {
        handleAuthWindowClose();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleAuthWindowClose]);

  // Fallback for when the popup can't reach `window.opener` (e.g. cross-origin
  // isolation or storage partitioning silently drops it) — without this, a
  // completed sign-in never triggers the reload and the user is stuck on the
  // login prompt until they manually refresh.
  useEffect(() => {
    if (!isWindowOpen) return;

    const intervalId = window.setInterval(() => {
      if (authWindowRef.current?.closed) {
        handleAuthWindowClose();
      }
    }, AUTH_WINDOW_POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isWindowOpen, handleAuthWindowClose]);

  // Extra fallback on top of the two above: the browser reliably fires
  // `focus` on the opener when the user returns from the popup, even in
  // cases where postMessage doesn't reach us and the `.closed` poll is
  // missed (e.g. this app itself is iframe-embedded). Re-check on focus so
  // a completed sign-in always triggers the reload without a manual refresh.
  useEffect(() => {
    if (!isWindowOpen) return;

    const handleFocus = () => {
      if (!authWindowRef.current || authWindowRef.current.closed) {
        handleAuthWindowClose();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isWindowOpen, handleAuthWindowClose]);

  return { session, sessionStatus, openLoginWindow, isWindowOpen };
};
