import { useEffect, useState } from 'react';
import { fetchApplicationRequiresAuthentication } from '@/utils/dialClient';

interface ApplicationAuthenticationResult {
  appId: string;
  isRequired: boolean;
}

/**
 * Whether the selected application needs the user to authenticate before it can be used.
 * Nothing is fetched without an `appId`. If the metadata request fails, the app is treated as
 * requiring authentication, so the host's retry/login action stays available.
 */
export const useApplicationAuthentication = (appId?: string): boolean => {
  const [result, setResult] = useState<ApplicationAuthenticationResult>();

  useEffect(() => {
    if (!appId) return;
    let isActive = true;

    const load = async () => {
      let isRequired: boolean;
      try {
        isRequired = await fetchApplicationRequiresAuthentication(appId);
      } catch {
        isRequired = true;
      }
      if (isActive) setResult({ appId, isRequired });
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [appId]);

  return !!appId && result?.appId === appId && result.isRequired;
};
