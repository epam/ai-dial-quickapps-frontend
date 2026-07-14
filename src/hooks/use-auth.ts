import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AUTH_WINDOW_CLOSE_KEY } from '@/constants/auth';

export const useAuth = (provider: string) => {
  const { data: session, status: sessionStatus } = useSession();
  const authWindowRef = useRef<Window | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  const openLoginWindow = useCallback(() => {
    if (isWindowOpen) return;
    setIsWindowOpen(true);
    authWindowRef.current = window.open(
      `/signin?authProvider=${encodeURIComponent(provider)}`,
      '_blank',
      'width=600,height=600',
    );
  }, [isWindowOpen, provider]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if ((event.data as { type?: string })?.type === AUTH_WINDOW_CLOSE_KEY) {
        setIsWindowOpen(false);
        window.location.reload();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return { session, sessionStatus, openLoginWindow, isWindowOpen };
};
