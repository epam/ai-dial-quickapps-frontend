'use client';
import { FC, useCallback, useEffect, useState } from 'react';

import { ModelIcon } from '@/components/common/ModelIcon/ModelIcon';
import { CommonI18nKeys, MarketplaceI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import { ToolsetAuthStatus, ToolsetAuthType } from '@/types/dial-entities';
import {
  InboundMessageType,
  OutboundMessageType,
  ToolsetAuthResultPayload,
} from '@/types/editor-messages';
import { Translation } from '@/types/translation';
import { getLocalizedText } from '@/utils/get-localized-text';
import {
  DialInput,
  DialNeutralButton,
  DialPopup,
  DialPrimaryButton,
  PopupSize,
} from '@epam/ai-dial-ui-kit';

import type { ChipEntity } from './AgentAndToolsetChip';

interface ToolsetLoginModalProps {
  toolset: ChipEntity;
  onClose: () => void;
}

const TOOLSET_SIGNIN_URL = '/api/dial-toolsets/signin';
const TOOLSET_SIGNOUT_URL = '/api/dial-toolsets/signout';

export const ToolsetLoginModal: FC<ToolsetLoginModalProps> = ({ toolset, onClose }) => {
  const { t, language } = useTranslation(Translation.Marketplace);
  const { settings } = useAppContext();
  const { refreshToolsets } = useDataContext();

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
      const res = await fetch(TOOLSET_SIGNOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: toolset.id }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
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
      const res = await fetch(TOOLSET_SIGNIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: toolset.id, apiKey }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
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
    const allowedOrigin = settings.allowedOrigin || '*';
    window.parent.postMessage(
      { type: OutboundMessageType.RequestToolsetLogin, toolsetId: toolset.id },
      allowedOrigin,
    );
  }, [settings.allowedOrigin, toolset.id]);

  const handleOAuthLogout = useCallback(() => {
    setError(undefined);
    setIsLoggingOut(true);
    const allowedOrigin = settings.allowedOrigin || '*';
    window.parent.postMessage(
      { type: OutboundMessageType.RequestToolsetLogout, toolsetId: toolset.id },
      allowedOrigin,
    );
  }, [settings.allowedOrigin, toolset.id]);

  useEffect(() => {
    if (!isOAuth) return;

    const allowedOrigin = settings.allowedOrigin;

    const handleMessage = (event: MessageEvent) => {
      if (allowedOrigin && allowedOrigin !== '*' && event.origin !== allowedOrigin) return;

      const msg = event.data as { type?: string } & Partial<ToolsetAuthResultPayload>;
      const isLoginResult = msg?.type === InboundMessageType.ToolsetLoginResult;
      const isLogoutResult = msg?.type === InboundMessageType.ToolsetLogoutResult;
      if (!isLoginResult && !isLogoutResult) return;
      if (msg.toolsetId !== toolset.id) return;

      if (isLoginResult) setIsLoggingIn(false);
      if (isLogoutResult) setIsLoggingOut(false);

      if (msg.success) {
        void refreshToolsets().then(onClose);
      } else {
        setError(t(CommonI18nKeys.ToolsetSignInFailed));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOAuth, settings.allowedOrigin, toolset.id, refreshToolsets, onClose, t]);

  return (
    <DialPopup
      open
      header={t(MarketplaceI18nKeys.AdvancedSettings)}
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
                      ? MarketplaceI18nKeys.LoggingOutToolsetAction
                      : MarketplaceI18nKeys.LogoutToolsetAction,
                  )}
                  onClick={handleOAuthLogout}
                  disabled={isLoggingOut}
                />
              ) : (
                <DialPrimaryButton
                  label={t(
                    isLoggingIn
                      ? MarketplaceI18nKeys.LoggingInToolsetAction
                      : MarketplaceI18nKeys.LoginToolsetAction,
                  )}
                  onClick={handleOAuthLogin}
                  disabled={isLoggingIn}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <DialInput
              value={apiKey}
              onChange={(v) => setApiKey(v ?? '')}
              placeholder={authSettings?.apiKeyHeader ?? t(MarketplaceI18nKeys.ApiKeyLabel)}
              containerClassName="w-full"
              type="password"
              disabled={isSignedIn}
            />
            {error && <p className="dial-tiny-text text-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <DialNeutralButton label={t(CommonI18nKeys.Cancel)} onClick={onClose} />
              {isSignedIn ? (
                <DialPrimaryButton
                  label={t(MarketplaceI18nKeys.LogoutToolsetAction)}
                  onClick={handleApiKeySignOut}
                  disabled={isSubmitting}
                />
              ) : (
                <DialPrimaryButton
                  label={t(MarketplaceI18nKeys.LoginToolsetAction)}
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
