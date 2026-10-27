import { IconCode } from '@tabler/icons-react';
import { FC, memo } from 'react';

import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';

import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
  LinkButton,
} from '@epam/ai-dial-ui-kit';

export interface EditJsonLinkProps {
  onClick: () => void;
}

const EditJsonLink: FC<EditJsonLinkProps> = ({ onClick }) => {
  const { t } = useTranslation();

  return (
    <LinkButton
      label={t(ApplicationEditorI18nKeys.EditJson)}
      iconBefore={
        <IconCode size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} aria-hidden="true" />
      }
      size={ElementSize.Small}
      onClick={onClick}
    />
  );
};

export default memo(EditJsonLink);
