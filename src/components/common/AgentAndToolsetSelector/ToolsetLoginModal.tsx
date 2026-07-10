'use client';
import { FC, useCallback, useEffect, useState } from 'react';

import { ModelIcon } from '@/components/common/ModelIcon/ModelIcon';
import { QUICKAPPS_TOOLSET_AUTH_POPUP_NAME } from '@/constants/editor';
import { CommonI18nKeys, MarketplaceI18nKeys } from '@/constants/i18n';
import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import { ToolsetAuthStatus, ToolsetAuthType, ToolsetCredentialsLevel } from '@/types/dial-entities';
import { InboundMessageType, type ToolsetLoginCompletePayload } from '@/types/editor-messages';
import { Translation } from '@/types/translation';
import { encodeApiUrl } from '@/utils/api';
import { encodeToolsetPopupState } from '@/utils/encode-toolset-popup-state';
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

//TODO: verify and fix
// DIAL Core does not currently expose a documented toolset sign-in endpoint
// for this app; this mirrors the shape used by the reference chat app
// (PUT/DELETE credentials) through the generic /api/dial proxy so it starts
// working once such an endpoint is available server-side.
const getToolsetAuthUrl = (id: string) => `/api/dial/v1/toolset/${encodeApiUrl(id)}/auth`;

export const ToolsetLoginModal: FC<ToolsetLoginModalProps> = ({ toolset, onClose }) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { settings } = useAppContext();
  const { refreshToolsets } = useDataContext();

  const authSettings = toolset.authSettings;
  const isSignedIn = authSettings?.authStatus === ToolsetAuthStatus.SignedIn;
  const isOAuth = authSettings?.authenticationType === ToolsetAuthType.OAuth;

  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSignOut = useCallback(async () => {
    setIsSubmitting(true);
    setError(undefined);
    try {
      const res = await fetch(getToolsetAuthUrl(toolset.id), {
        method: 'DELETE',
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
      const res = await fetch(getToolsetAuthUrl(toolset.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
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
    if (
      !authSettings?.authorizationEndpoint ||
      !authSettings.clientId ||
      !authSettings.redirectUri
    ) {
      return;
    }
    const url = new URL(authSettings.authorizationEndpoint);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', authSettings.clientId);
    url.searchParams.set('redirect_uri', authSettings.redirectUri);
    url.searchParams.set(
      'state',
      encodeToolsetPopupState({
        toolsetId: toolset.id,
        credentialsLevel: ToolsetCredentialsLevel.User,
        originatingOrigin: window.location.origin,
        nonce: crypto.randomUUID(),
      }),
    );
    if (authSettings.scopesSupported?.length) {
      url.searchParams.set('scope', authSettings.scopesSupported.join(' '));
    }
    window.open(url.href, QUICKAPPS_TOOLSET_AUTH_POPUP_NAME, 'width=500,height=700');
  }, [authSettings, toolset.id]);

  useEffect(() => {
    if (!isOAuth) return;

    const allowedOrigin = settings.allowedOrigin;

    const handleMessage = (event: MessageEvent) => {
      if (allowedOrigin && allowedOrigin !== '*' && event.origin !== allowedOrigin) return;

      const msg = event.data as { type?: string; payload?: ToolsetLoginCompletePayload };
      if (msg?.type !== InboundMessageType.ToolsetLoginComplete) return;
      if (msg.payload?.toolsetId !== toolset.id) return;

      if (msg.payload.success) {
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
          <ModelIcon name={toolset.name ?? toolset.id} size={40} radius={10} />
          <span className="dial-small-semi-text text-primary">{toolset.name ?? toolset.id}</span>
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
                  label={t(MarketplaceI18nKeys.LogoutToolsetAction)}
                  onClick={handleSignOut}
                  disabled={isSubmitting}
                />
              ) : (
                <DialPrimaryButton
                  label={t(MarketplaceI18nKeys.LoginToolsetAction)}
                  onClick={handleOAuthLogin}
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
                  onClick={handleSignOut}
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
