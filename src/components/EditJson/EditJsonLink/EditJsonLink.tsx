import { IconCode } from '@tabler/icons-react';
import { FC, memo } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';

import {
  Button,
  ButtonAppearance,
  ButtonVariant,
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
} from '@epam/ai-dial-ui-kit';

export interface EditJsonLinkProps {
  onClick: () => void;
}

const EditJsonLink: FC<EditJsonLinkProps> = ({ onClick }) => {
  const { t } = useTranslation();

  return (
    <Button
      label={t(ApplicationEditorI18nKeys.EditJson)}
      iconBefore={
        <IconCode size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} aria-hidden="true" />
      }
      variant={ButtonVariant.Primary}
      appearance={ButtonAppearance.Link}
      size={ElementSize.Small}
      onClick={onClick}
    />
  );
};

export default memo(EditJsonLink);
