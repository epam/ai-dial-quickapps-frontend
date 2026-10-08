import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  GhostButton,
  PrimaryButton,
} from '@epam/ai-dial-ui-kit';
import { IconLogin, IconLogout } from '@tabler/icons-react';
import { FC, useCallback, useEffect, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/use-translation';
import { type DialToolset, ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';
import {
  InboundMessageType,
  OutboundMessageType,
  type ToolsetAuthResultPayload,
} from '@/types/editor-messages';
import { Translation } from '@/types/translation';
import { isOriginAllowed, postToHost } from '@/utils/allowed-origins';

import { ToolsetLoginModal } from '@/components/Toolsets/ToolsetLoginModal/ToolsetLoginModal';

export interface ToolsetCredentialsActionProps {
  toolset: DialToolset;
}

/**
 * Log in / Log out for a toolset that needs authentication. OAuth goes
 * through the host (REQUEST_TOOLSET_LOGIN/LOGOUT, answered by
 * TOOLSET_LOGIN_RESULT/LOGOUT_RESULT); API keys open the key form. The
 * toolset is read live from `DataContext`, so the label follows the result.
 */
export const ToolsetCredentialsAction: FC<ToolsetCredentialsActionProps> = ({ toolset }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { settings } = useAppContext();
  const { applyToolsetAuthResult } = useDataContext();

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isApiKeyFormOpen, setIsApiKeyFormOpen] = useState(false);
  const [error, setError] = useState<string>();

  const isOAuth = toolset.authSettings?.authenticationType === ToolsetAuthType.OAuth;
  const isSignedIn = toolset.authSettings?.authStatus === ToolsetAuthStatus.SignedIn;

  useEffect(() => {
    if (!isOAuth) return undefined;

    const handleMessage = (event: MessageEvent) => {
      if (!isOriginAllowed(event.origin, settings.allowedOrigins)) return;

      const msg = event.data as { type?: string } & Partial<ToolsetAuthResultPayload>;
      const isLoginResult = msg?.type === InboundMessageType.ToolsetLoginResult;
      const isLogoutResult = msg?.type === InboundMessageType.ToolsetLogoutResult;
      if (!isLoginResult && !isLogoutResult) return;
      if (msg.toolsetId !== toolset.id) return;

      if (isLoginResult) setIsLoggingIn(false);
      if (isLogoutResult) setIsLoggingOut(false);

      if (msg.success) {
        // Trust the host's own report of the fresh auth status directly
        // instead of re-fetching the toolsets list, which can still return
        // stale data for a moment after a login/logout completes.
        applyToolsetAuthResult(
          msg as ToolsetAuthResultPayload,
          isLoginResult ? ToolsetAuthStatus.SignedIn : ToolsetAuthStatus.SignedOut,
        );
        setError(undefined);
      } else {
        setError(tCommon(CommonI18nKeys.ToolsetSignInFailed));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOAuth, settings.allowedOrigins, toolset.id, applyToolsetAuthResult, tCommon]);

  const handleLogin = useCallback(() => {
    if (!isOAuth) {
      setIsApiKeyFormOpen(true);
      return;
    }
    setError(undefined);
    setIsLoggingIn(true);
    postToHost(
      { type: OutboundMessageType.RequestToolsetLogin, toolsetId: toolset.id },
      settings.allowedOrigins,
    );
  }, [isOAuth, settings.allowedOrigins, toolset.id]);

  const handleLogout = useCallback(() => {
    if (!isOAuth) {
      setIsApiKeyFormOpen(true);
      return;
    }
    setError(undefined);
    setIsLoggingOut(true);
    postToHost(
      { type: OutboundMessageType.RequestToolsetLogout, toolsetId: toolset.id },
      settings.allowedOrigins,
    );
  }, [isOAuth, settings.allowedOrigins, toolset.id]);

  return (
    <>
      {isSignedIn ? (
        <GhostButton
          label={t(
            isLoggingOut
              ? QuickAppEditorI18nKeys.LoggingOutToolsetAction
              : QuickAppEditorI18nKeys.LogoutToolsetAction,
          )}
          iconBefore={<IconLogout size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
          disabled={isLoggingOut}
          onClick={handleLogout}
        />
      ) : (
        <PrimaryButton
          label={t(
            isLoggingIn
              ? QuickAppEditorI18nKeys.LoggingInToolsetAction
              : QuickAppEditorI18nKeys.LoginToolsetAction,
          )}
          iconBefore={<IconLogin size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
          disabled={isLoggingIn}
          onClick={handleLogin}
        />
      )}
      {error && (
        <p role="alert" className="dial-tiny-text text-error">
          {error}
        </p>
      )}
      {isApiKeyFormOpen && (
        <ToolsetLoginModal toolset={toolset} onClose={() => setIsApiKeyFormOpen(false)} />
      )}
    </>
  );
};
