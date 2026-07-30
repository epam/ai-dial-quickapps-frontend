import { signOut } from 'next-auth/react';

const RELOAD_TS_KEY = 'dial_auth_401_ts';
const LOOP_WINDOW_MS = 30_000;

/**
 * Shared handler for any 401 path (fetch or XHR). On the first 401 after a
 * successful session, reloads once — NextAuth may refresh an expired token
 * server-side. If another 401 arrives within LOOP_WINDOW_MS (token is
 * permanently invalid for DIAL Core, e.g. wrong audience), signs out instead
 * of looping indefinitely.
 */
export const handleUnauthorized401 = (): void => {
  const lastReload = Number(sessionStorage.getItem(RELOAD_TS_KEY) ?? 0);
  if (Date.now() - lastReload < LOOP_WINDOW_MS) {
    sessionStorage.removeItem(RELOAD_TS_KEY);
    void signOut({ callbackUrl: '/' });
  } else {
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
    window.location.reload();
  }
};

export const handleUnauthorizedResponse = (res: Response): boolean => {
  if (res.status !== 401) return false;
  handleUnauthorized401();
  return true;
};
