import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
  NeutralButton,
} from '@epam/ai-dial-ui-kit';
import { IconPlus } from '@tabler/icons-react';
import { FC, MouseEvent, ReactNode } from 'react';

import { SectionRow } from '@/components/common/SectionRow/SectionRow';
import { CommonI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

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
  const { t } = useTranslation(Translation.Common);

  const handleAdd = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onAdd();
  };

  return (
    <SectionRow
      title={label}
      description={isEmpty ? emptyDescription : undefined}
      action={
        <NeutralButton
          size={ElementSize.Small}
          iconBefore={
            actionIcon ?? <IconPlus size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />
          }
          label={actionLabel ?? t(CommonI18nKeys.Add)}
          disabled={isAddDisabled}
          tooltipProps={addTooltip ? { tooltip: addTooltip } : undefined}
          onClick={handleAdd}
        />
      }
    >
      {children}
    </SectionRow>
  );
};
