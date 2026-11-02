import { IconAlertTriangle } from '@tabler/icons-react';
import { FC, memo } from 'react';

import { AuthI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';
import { AuthErrorReason } from '@/types/auth';
import { DIAL_ICON_SIZE, DIAL_KIT_ICON_STROKE, StateScreen } from '@epam/ai-dial-ui-kit';

interface AuthErrorProps {
  reason: AuthErrorReason;
  /** The requested provider id, shown for `AuthErrorReason.ProviderNotConfigured`. */
  provider?: string;
}

const AuthError: FC<AuthErrorProps> = ({ reason, provider }) => {
  const { t } = useTranslation();

  let description: string;
  switch (reason) {
    case AuthErrorReason.ProviderNotConfigured:
      description = t(AuthI18nKeys.ErrorProviderNotConfigured, { provider });
      break;
    case AuthErrorReason.NoProvider:
    default:
      description = t(AuthI18nKeys.ErrorNoProvider);
      break;
  }

  // No action: the user can't fix host or deployment configuration from here.
  return (
    <StateScreen
      className="h-screen"
      icon={<IconAlertTriangle size={DIAL_ICON_SIZE.LG} stroke={DIAL_KIT_ICON_STROKE} />}
      title={t(AuthI18nKeys.ErrorTitle)}
      description={description}
    />
  );
};

export default memo(AuthError);
