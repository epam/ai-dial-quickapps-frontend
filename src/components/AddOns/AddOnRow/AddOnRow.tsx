import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
  FormSection,
  NeutralButton,
} from '@epam/ai-dial-ui-kit';
import { IconPlus } from '@tabler/icons-react';
import { FC, MouseEvent, ReactNode } from 'react';

import { ButtonsI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';

export interface AddOnRowProps {
  label: string;
  emptyDescription: string;
  isEmpty: boolean;
  isAddDisabled?: boolean;
  addTooltip?: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  children: ReactNode;
  onAdd: () => void;
}

export const AddOnRow: FC<AddOnRowProps> = ({
  label,
  emptyDescription,
  isEmpty,
  isAddDisabled,
  addTooltip,
  actionLabel,
  actionIcon,
  children,
  onAdd,
}) => {
  const { t } = useTranslation();

  const handleAdd = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onAdd();
  };

  return (
    <FormSection
      title={label}
      description={isEmpty ? emptyDescription : undefined}
      action={
        <NeutralButton
          size={ElementSize.Small}
          iconBefore={
            actionIcon ?? <IconPlus size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />
          }
          label={actionLabel ?? t(ButtonsI18nKeys.Add)}
          disabled={isAddDisabled}
          tooltipProps={addTooltip ? { tooltip: addTooltip } : undefined}
          onClick={handleAdd}
        />
      }
    >
      {children}
    </FormSection>
  );
};
