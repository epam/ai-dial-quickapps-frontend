import { useEffect, useState } from 'react';
import { fetchApplicationRequiresAuthentication } from '@/utils/dialClient';

/** Load only selected applications, keeping the host's retry form available on failure. */
export const useApplicationAuthentication = (appId?: string): boolean => {
  const [result, setResult] = useState<{ appId: string; required: boolean }>();
  useEffect(() => {
    if (!appId) return;
    let active = true;
    fetchApplicationRequiresAuthentication(appId)
      .then((required) => {
        if (active) setResult({ appId, required });
      })
      .catch(() => {
        if (active) setResult({ appId, required: true });
      });
    return () => {
      active = false;
    };
  }, [appId]);
  return !!appId && result?.appId === appId && result.required;
};
