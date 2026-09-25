import {
  createContext,
  FC,
  memo,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { AuthStatus, UserProfile } from '@/types/auth';
import { getCurrentUser, logout as logoutRequest, UnauthorizedError } from '@/utils/auth-api';

interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthContextProviderProps {
  children: ReactNode;
}

const AuthContextProvider: FC<AuthContextProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>(AuthStatus.Loading);
  const [user, setUser] = useState<UserProfile | null>(null);

  const refresh = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setStatus(AuthStatus.Authenticated);
    } catch (error) {
      // Any failure to establish a session — including a genuine
      // `UnauthorizedError` and any transient/network error — is treated as
      // logged out, mirroring next-auth's own fallback behavior rather than
      // getting stuck in `Loading` forever.
      if (!(error instanceof UnauthorizedError)) {
        console.error('Failed to fetch current user', error);
      }
      setUser(null);
      setStatus(AuthStatus.Unauthenticated);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Mirrors next-auth's `SessionProvider` default: revalidate when the tab
  // regains focus, so a session change made elsewhere (sign-out, expiry) is
  // picked up without requiring a manual reload.
  useEffect(() => {
    const handleFocus = () => void refresh();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refresh]);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setStatus(AuthStatus.Unauthenticated);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, refresh, logout }),
    [status, user, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default memo(AuthContextProvider);

export const useAuthContext = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthContextProvider');
  return ctx;
};
