import { IconAlertTriangle } from '@tabler/icons-react';
import { FC, memo } from 'react';

import AuthStateScreen from '@/components/common/AuthStateScreen/AuthStateScreen';
import { CommonI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { AuthErrorReason } from '@/types/auth';
import { Translation } from '@/types/translation';
import { DIAL_ICON_SIZE, DIAL_KIT_ICON_STROKE } from '@epam/ai-dial-ui-kit';

interface AuthErrorProps {
  reason: AuthErrorReason;
  /** The requested provider id, shown for `AuthErrorReason.ProviderNotConfigured`. */
  provider?: string;
}

const AuthError: FC<AuthErrorProps> = ({ reason, provider }) => {
  const { t } = useTranslation(Translation.Common);

  let description: string;
  switch (reason) {
    case AuthErrorReason.ProviderNotConfigured:
      description = t(CommonI18nKeys.AuthErrorProviderNotConfigured, { provider });
      break;
    case AuthErrorReason.NoProvider:
    default:
      description = t(CommonI18nKeys.AuthErrorNoProvider);
      break;
  }

  // No action: the user can't fix host or deployment configuration from here.
  return (
    <AuthStateScreen
      icon={<IconAlertTriangle size={DIAL_ICON_SIZE.LG} stroke={DIAL_KIT_ICON_STROKE} />}
      title={t(CommonI18nKeys.AuthErrorTitle)}
      description={description}
    />
  );
};

export default memo(AuthError);
