import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuthContext } from '@/context/AuthContext';
import { AuthStatus } from '@/types/auth';
import { buildLoginUrl } from '@/utils/auth-api';

const AUTH_WINDOW_POLL_INTERVAL_MS = 3000;

export const useAuth = (provider: string) => {
  const { status, refresh } = useAuthContext();
  const authWindowRef = useRef<Window | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  const openLoginWindow = useCallback(() => {
    if (isWindowOpen) return;
    setIsWindowOpen(true);
    const callbackUrl = `${window.location.origin}/signin/complete`;
    const authWindow = window.open(
      buildLoginUrl(provider, callbackUrl),
      '_blank',
      'width=600,height=600',
    );
    authWindowRef.current = authWindow;
    if (authWindow) {
      // Anti-tabnabbing: sever the popup's reference back to us. Safe even
      // though the popup immediately navigates cross-origin to the IdP.
      try {
        authWindow.opener = null;
      } catch {
        // Ignore — some browsers may disallow this; it's a hardening step,
        // not something the sign-in flow depends on.
      }
    } else {
      setIsWindowOpen(false);
    }
  }, [isWindowOpen, provider]);

  // chat-api's login/callback flow is a plain full-page redirect with no
  // postMessage handshake — IdP login pages can set COOP headers that sever
  // window.opener unpredictably (see docs/TRANSITION_PLAN.md §2.3 and
  // ai-dial-chat's useOverlayExternalLogin). Poll our own session instead of
  // waiting on a message from the popup.
  useEffect(() => {
    if (!isWindowOpen) return;

    const check = () => void refresh();
    const intervalId = window.setInterval(check, AUTH_WINDOW_POLL_INTERVAL_MS);
    window.addEventListener('focus', check);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', check);
    };
  }, [isWindowOpen, refresh]);

  // Once polling confirms we're signed in, close the popup ourselves.
  useEffect(() => {
    if (!isWindowOpen || status !== AuthStatus.Authenticated) return;
    setIsWindowOpen(false);
    authWindowRef.current?.close();
    authWindowRef.current = null;
  }, [isWindowOpen, status]);

  return { status, openLoginWindow, isWindowOpen };
};
