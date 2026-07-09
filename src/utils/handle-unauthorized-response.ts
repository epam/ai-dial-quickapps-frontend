/**
 * When the DIAL Core proxy returns 401 (access token expired and the
 * refresh attempt failed server-side), the client has no valid session to
 * recover with on its own. Reload so the root server component re-checks
 * the session and falls back to the sign-in prompt.
 */
export const handleUnauthorizedResponse = (res: Response): boolean => {
  if (res.status !== 401) return false;
  window.location.reload();
  return true;
};
