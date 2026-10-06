import { IconExternalLink, IconLock } from '@tabler/icons-react';
import { FC, memo } from 'react';

import { CommonI18nKeys } from '@/constants/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { DIAL_ICON_SIZE, DIAL_KIT_ICON_STROKE, NeutralButton } from '@epam/ai-dial-ui-kit';

interface LoginScreenProps {
  provider: string;
}

const LoginScreen: FC<LoginScreenProps> = ({ provider }) => {
  const { openLoginWindow, isWindowOpen } = useAuth(provider);
  const { t } = useTranslation(Translation.Common);

  return (
    <div className="flex h-screen flex-col items-center justify-center px-4 text-center">
      <span
        aria-hidden
        className="flex size-14 items-center justify-center rounded-full border border-secondary text-secondary"
      >
        <IconLock size={DIAL_ICON_SIZE.LG} stroke={DIAL_KIT_ICON_STROKE} />
      </span>
      <h1 className="dial-body-semi-text mt-4 text-primary">
        {t(CommonI18nKeys.LoginScreenTitle)}
      </h1>
      <p className="dial-small-text mt-2 text-secondary">
        {t(CommonI18nKeys.LoginScreenDescription)}
      </p>

      <NeutralButton
        className="mt-4"
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
    </div>
  );
};

export default memo(LoginScreen);
