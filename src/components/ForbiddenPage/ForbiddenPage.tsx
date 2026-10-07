import { IconLockX } from '@tabler/icons-react';
import { FC, memo, useCallback, useState } from 'react';

import AuthStateScreen from '@/components/common/AuthStateScreen/AuthStateScreen';
import { CommonI18nKeys } from '@/constants/i18n';
import { useAuthContext } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { DIAL_ICON_SIZE, DIAL_KIT_ICON_STROKE, NeutralButton } from '@epam/ai-dial-ui-kit';

const ForbiddenPage: FC = () => {
  const { logout } = useAuthContext();
  const { t } = useTranslation(Translation.Common);
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
      title={t(CommonI18nKeys.ForbiddenTitle)}
      description={t(CommonI18nKeys.ForbiddenDescription)}
      action={
        <NeutralButton
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          label={t(
            isLoggingOut ? CommonI18nKeys.ForbiddenActionPending : CommonI18nKeys.ForbiddenAction,
          )}
        />
      }
    />
  );
};

export default memo(ForbiddenPage);
