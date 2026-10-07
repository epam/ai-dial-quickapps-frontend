import { IconExternalLink, IconLock } from '@tabler/icons-react';
import { FC, memo } from 'react';

import AuthStateScreen from '@/components/common/AuthStateScreen/AuthStateScreen';
import { CommonI18nKeys } from '@/constants/i18n';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';
import { DIAL_ICON_SIZE, DIAL_KIT_ICON_STROKE, NeutralButton } from '@epam/ai-dial-ui-kit';

interface LoginScreenProps {
  provider: string;
}

const LoginScreen: FC<LoginScreenProps> = ({ provider }) => {
  const { openLoginWindow, isWindowOpen } = useAuth(provider);
  const { t } = useTranslation(Translation.Common);

  return (
    <AuthStateScreen
      icon={<IconLock size={DIAL_ICON_SIZE.LG} stroke={DIAL_KIT_ICON_STROKE} />}
      title={t(CommonI18nKeys.LoginScreenTitle)}
      description={t(CommonI18nKeys.LoginScreenDescription)}
      action={
        <NeutralButton
          disabled={isWindowOpen}
          onClick={openLoginWindow}
          label={t(
            isWindowOpen ? CommonI18nKeys.LoginScreenWindowOpen : CommonI18nKeys.LoginScreenAction,
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
