import { FC, useCallback, useState } from 'react';

import { ModelIcon } from '@/components/common/ModelIcon/ModelIcon';
import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/use-translation';
import { type DialToolset, ToolsetAuthStatus } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { isPublicToolsetId } from '@/utils/api';
import { toolsetsApi } from '@/utils/chat-api-client';
import { encodeDialPath } from '@/utils/dialClient';
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

export interface ToolsetLoginModalProps {
  toolset: DialToolset;
  onClose: () => void;
}

/** Public toolsets are signed in per-user, private ones per-workspace — mirrors dialClient.ts's mapAuthSettings. */
const credentialsLevelFor = (toolsetId: string): ToolsetLoginBodyDtoCredentialsLevelEnum =>
  isPublicToolsetId(toolsetId)
    ? ToolsetLoginBodyDtoCredentialsLevelEnum.User
    : ToolsetLoginBodyDtoCredentialsLevelEnum.Global;

/**
 * Signs an API-key toolset in (with the entered key) or out. OAuth toolsets
 * sign in through the host instead — see `ToolsetCredentialsAction`.
 */
export const ToolsetLoginModal: FC<ToolsetLoginModalProps> = ({ toolset, onClose }) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { refreshToolsets } = useDataContext();

  const toolsetName = getLocalizedText(toolset.name, language, toolset.id);
  const authSettings = toolset.authSettings;
  const isSignedIn = authSettings?.authStatus === ToolsetAuthStatus.SignedIn;

  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      </div>
    </DialPopup>
  );
};
