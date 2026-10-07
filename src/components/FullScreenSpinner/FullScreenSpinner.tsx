import { Spinner } from '@epam/ai-dial-ui-kit';
import { FC } from 'react';

import { CommonI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

const FullScreenSpinner: FC = () => {
  const { t } = useTranslation(Translation.Common);

  return (
    <Spinner fullWidth className="h-screen bg-layer-base" ariaLabel={t(CommonI18nKeys.Loading)} />
  );
};

export default FullScreenSpinner;
