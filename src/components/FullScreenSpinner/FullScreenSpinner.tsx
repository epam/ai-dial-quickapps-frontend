import { Spinner } from '@epam/ai-dial-ui-kit';
import { FC } from 'react';

import { BasicI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';

const FullScreenSpinner: FC = () => {
  const { t } = useTranslation();

  return (
    <Spinner fullWidth className="h-screen bg-layer-base" ariaLabel={t(BasicI18nKeys.Loading)} />
  );
};

export default FullScreenSpinner;
