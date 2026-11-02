import { IconExternalLink, IconLock } from '@tabler/icons-react';
import { FC, memo } from 'react';

import { AuthI18nKeys, ButtonsI18nKeys } from '@/constants/translation-keys';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  NeutralButton,
  StateScreen,
} from '@epam/ai-dial-ui-kit';

interface LoginScreenProps {
  provider: string;
}

const LoginScreen: FC<LoginScreenProps> = ({ provider }) => {
  const { openLoginWindow, isWindowOpen } = useAuth(provider);
  const { t } = useTranslation();

  return (
    <StateScreen
      className="h-screen"
      icon={<IconLock size={DIAL_ICON_SIZE.LG} stroke={DIAL_KIT_ICON_STROKE} />}
      title={t(AuthI18nKeys.ConfigureTitle)}
      description={t(AuthI18nKeys.ConfigureDescription)}
      action={
        <NeutralButton
          disabled={isWindowOpen}
          onClick={openLoginWindow}
          label={t(
            isWindowOpen ? AuthI18nKeys.LoginWindowOpen : ButtonsI18nKeys.LogIn,
          )}
          iconAfter={
            <IconExternalLink
              aria-hidden
              size={DIAL_ICON_SIZE.MD}
              stroke={DIAL_KIT_ICON_STROKE}
              className="rtl:scale-x-[-1]"
            />
          }
        />
      }
    />
  );
};

export default memo(LoginScreen);
