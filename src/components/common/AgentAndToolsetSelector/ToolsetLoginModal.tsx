import { FC, useCallback, useEffect, useState } from 'react';

import { ModelIcon } from '@/components/common/ModelIcon/ModelIcon';
import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/use-translation';
import { ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';
import {
  InboundMessageType,
  OutboundMessageType,
  ToolsetAuthResultPayload,
} from '@/types/editor-messages';
import { Translation } from '@/types/translation';
import { postToHost, isOriginAllowed } from '@/utils/allowed-origins';
import { isPublicToolsetId } from '@/utils/api';
import { toolsetsApi } from '@/utils/chat-api-client';
import { encodeDialPath } from '@/utils/dial-client';
import { getLocalizedText } from '@/utils/get-localized-text';
import {
  DialNeutralButton,
  DialPopup,
  DialPrimaryButton,
  PasswordInput,
  PopupSize,
} from '@epam/ai-dial-ui-kit';
import {
  ToolsetLoginBodyDtoAuthenticationTypeEnum,
  ToolsetLoginBodyDtoCredentialsLevelEnum,
  ToolsetLogoutBodyDtoAuthenticationTypeEnum,
} from '@epam/ai-dial-chat-api-client';

import type { ChipEntity } from './AgentAndToolsetChip';

interface ToolsetLoginModalProps {
  toolset: ChipEntity;
  onClose: () => void;
}

/** Public toolsets are signed in per-user, private ones per-workspace — mirrors dial-client.ts's mapAuthSettings. */
const credentialsLevelFor = (toolsetId: string): ToolsetLoginBodyDtoCredentialsLevelEnum =>
  isPublicToolsetId(toolsetId)
    ? ToolsetLoginBodyDtoCredentialsLevelEnum.User
    : ToolsetLoginBodyDtoCredentialsLevelEnum.Global;

export const ToolsetLoginModal: FC<ToolsetLoginModalProps> = ({ toolset, onClose }) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { settings } = useAppContext();
  const { refreshToolsets, applyToolsetAuthResult } = useDataContext();

  const toolsetName = getLocalizedText(toolset.name, language, toolset.id);
  const authSettings = toolset.authSettings;
  const isSignedIn = authSettings?.authStatus === ToolsetAuthStatus.SignedIn;
  const isOAuth = authSettings?.authenticationType === ToolsetAuthType.OAuth;

  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleApiKeySignOut = useCallback(async () => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      await toolsetsApi.logoutToolset({
        toolsetName: encodeDialPath(toolset.id),
        toolsetLogoutBodyDto: {
          url: toolset.id,
          credentialsLevel: credentialsLevelFor(toolset.id),
          authenticationType: ToolsetLogoutBodyDtoAuthenticationTypeEnum.ApiKey,
        },
      });
      await refreshToolsets();
      onClose();
    } catch {
      setError(t(CommonI18nKeys.ToolsetSignInFailed));
    } finally {
      setIsSubmitting(false);
    }
  }, [onClose, refreshToolsets, t, toolset.id]);

  const handleApiKeySubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      await toolsetsApi.loginToolset({
        toolsetName: encodeDialPath(toolset.id),
        toolsetLoginBodyDto: {
          url: toolset.id,
          credentialsLevel: credentialsLevelFor(toolset.id),
          authenticationType: ToolsetLoginBodyDtoAuthenticationTypeEnum.ApiKey,
          apiKey,
        },
      });
      await refreshToolsets();
      onClose();
    } catch {
      setError(t(CommonI18nKeys.ToolsetSignInFailed));
    } finally {
      setIsSubmitting(false);
    }
  }, [apiKey, onClose, refreshToolsets, t, toolset.id]);

  const handleOAuthLogin = useCallback(() => {
    setError(undefined);
    setIsLoggingIn(true);
    postToHost(
      { type: OutboundMessageType.RequestToolsetLogin, toolsetId: toolset.id },
      settings.allowedOrigins,
    );
  }, [settings.allowedOrigins, toolset.id]);

  const handleOAuthLogout = useCallback(() => {
    setError(undefined);
    setIsLoggingOut(true);
    postToHost(
      { type: OutboundMessageType.RequestToolsetLogout, toolsetId: toolset.id },
      settings.allowedOrigins,
    );
  }, [settings.allowedOrigins, toolset.id]);

  useEffect(() => {
    if (!isOAuth) return;

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
        onClose();
      } else {
        setError(t(CommonI18nKeys.ToolsetSignInFailed));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOAuth, settings.allowedOrigins, toolset.id, applyToolsetAuthResult, onClose, t]);

  return (
    <DialPopup
      open
      header={t(QuickAppEditorI18nKeys.AdvancedSettings)}
      size={PopupSize.Sm}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <ModelIcon name={toolsetName} size={40} radius={10} />
          <span className="dial-small-semi-text text-primary">{toolsetName}</span>
        </div>

        {isOAuth ? (
          <div className="flex flex-col gap-3">
            <p className="dial-small-text text-secondary">
              {isSignedIn ? t(CommonI18nKeys.LoggedInToolset) : t(CommonI18nKeys.LoggedOutToolset)}
            </p>
            {error && <p className="dial-tiny-text text-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <DialNeutralButton label={t(CommonI18nKeys.Cancel)} onClick={onClose} />
              {isSignedIn ? (
                <DialPrimaryButton
                  label={t(
                    isLoggingOut
                      ? QuickAppEditorI18nKeys.LoggingOutToolsetAction
                      : QuickAppEditorI18nKeys.LogoutToolsetAction,
                  )}
                  onClick={handleOAuthLogout}
                  disabled={isLoggingOut}
                />
              ) : (
                <DialPrimaryButton
                  label={t(
                    isLoggingIn
                      ? QuickAppEditorI18nKeys.LoggingInToolsetAction
                      : QuickAppEditorI18nKeys.LoginToolsetAction,
                  )}
                  onClick={handleOAuthLogin}
                  disabled={isLoggingIn}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <PasswordInput
              value={apiKey}
              onChange={(v) => setApiKey(v ?? '')}
              placeholder={authSettings?.apiKeyHeader ?? t(QuickAppEditorI18nKeys.ApiKeyLabel)}
              containerClassName="w-full"
              disabled={isSignedIn}
              showPasswordLabel={tCommon(CommonI18nKeys.ShowPassword)}
              hidePasswordLabel={tCommon(CommonI18nKeys.HidePassword)}
            />
            {error && <p className="dial-tiny-text text-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <DialNeutralButton label={t(CommonI18nKeys.Cancel)} onClick={onClose} />
              {isSignedIn ? (
                <DialPrimaryButton
                  label={t(QuickAppEditorI18nKeys.LogoutToolsetAction)}
                  onClick={handleApiKeySignOut}
                  disabled={isSubmitting}
                />
              ) : (
                <DialPrimaryButton
                  label={t(QuickAppEditorI18nKeys.LoginToolsetAction)}
                  onClick={handleApiKeySubmit}
                  disabled={isSubmitting || !apiKey.trim()}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </DialPopup>
  );
};
