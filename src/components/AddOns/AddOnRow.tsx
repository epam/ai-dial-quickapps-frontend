import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
  NeutralButton,
} from '@epam/ai-dial-ui-kit';
import { IconPlus } from '@tabler/icons-react';
import { FC, MouseEvent, ReactNode } from 'react';

import { CommonI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

export interface AddOnRowProps {
  label: string;
  emptyDescription: string;
  isEmpty: boolean;
  isAddDisabled?: boolean;
  addTooltip?: string;
  children: ReactNode;
  onAdd: () => void;
}

export const AddOnRow: FC<AddOnRowProps> = ({
  label,
  emptyDescription,
  isEmpty,
  isAddDisabled,
  addTooltip,
  children,
  onAdd,
}) => {
  const { t } = useTranslation(Translation.Common);

  const handleAdd = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onAdd();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center justify-between gap-2">
        <h3 className="dial-small-semi-text text-primary">{label}</h3>
        <NeutralButton
          size={ElementSize.Small}
          iconBefore={<IconPlus size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
          label={t(CommonI18nKeys.Add)}
          disabled={isAddDisabled}
          tooltipProps={addTooltip ? { tooltip: addTooltip } : undefined}
          onClick={handleAdd}
        />
      </div>
      {isEmpty && <p className="dial-small-text text-secondary">{emptyDescription}</p>}
      <div className="relative">{children}</div>
    </div>
  );
};
