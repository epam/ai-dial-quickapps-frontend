import { IconLockX } from '@tabler/icons-react';
import { FC, memo, useCallback, useState } from 'react';

import AuthStateScreen from '@/components/common/AuthStateScreen/AuthStateScreen';
import { AuthI18nKeys, ButtonsI18nKeys } from '@/constants/translation-keys';
import { useAuthContext } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { DIAL_ICON_SIZE, DIAL_KIT_ICON_STROKE, NeutralButton } from '@epam/ai-dial-ui-kit';

const ForbiddenPage: FC = () => {
  const { logout } = useAuthContext();
  const { t } = useTranslation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Session state is unchanged on failure, so this screen stays and the user can retry.
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout]);

  return (
    <AuthStateScreen
      icon={<IconLockX size={DIAL_ICON_SIZE.LG} stroke={DIAL_KIT_ICON_STROKE} />}
      title={t(AuthI18nKeys.ForbiddenTitle)}
      description={t(AuthI18nKeys.ForbiddenDescription)}
      action={
        <NeutralButton
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          label={t(
            isLoggingOut ? AuthI18nKeys.LoggingOutPending : ButtonsI18nKeys.LogOut,
          )}
        />
      }
    />
  );
};

export default memo(ForbiddenPage);
