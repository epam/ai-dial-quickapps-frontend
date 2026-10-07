import { DIAL_ICON_SIZE, DIAL_KIT_ICON_STROKE } from '@epam/ai-dial-ui-kit';
import { IconPencil } from '@tabler/icons-react';
import { FC, memo, useCallback, useMemo, useState } from 'react';

import { AddOnRow } from '@/components/AddOns/AddOnRow';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import type { ConversationStartersValues } from '@/types/conversation-starters';
import { Translation } from '@/types/translation';
import { isSavedVisibleStarter } from '@/utils/conversation-starters';

import { ConversationStartersList } from './ConversationStartersList';
import ConversationStartersModal from './ConversationStartersModal';

export interface ConversationStartersRowProps {
  values: ConversationStartersValues;
  isReadonly: boolean;
  tooltip?: string;
  onSave: (values: ConversationStartersValues) => void;
}

const ConversationStartersRow: FC<ConversationStartersRowProps> = ({
  values,
  isReadonly,
  tooltip,
  onSave,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const visibleStarters = useMemo(
    () => values.starters.filter(isSavedVisibleStarter),
    [values.starters],
  );
  const isEmpty = visibleStarters.length === 0;

  const handleOpen = useCallback(() => setIsModalOpen(true), []);
  const handleClose = useCallback(() => setIsModalOpen(false), []);

  return (
    <>
      <AddOnRow
        label={t(QuickAppEditorI18nKeys.ConversationStarters)}
        emptyDescription={t(QuickAppEditorI18nKeys.ConversationStartersAddOnDescription)}
        isEmpty={isEmpty}
        isAddDisabled={isReadonly}
        addTooltip={tooltip}
        actionLabel={isEmpty ? undefined : t(QuickAppEditorI18nKeys.Manage)}
        actionIcon={
          isEmpty ? undefined : (
            <IconPencil size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />
          )
        }
        onAdd={handleOpen}
      >
        {isEmpty ? null : <ConversationStartersList starters={visibleStarters} />}
      </AddOnRow>
      {isModalOpen && !isReadonly && (
        <ConversationStartersModal values={values} onSave={onSave} onClose={handleClose} />
      )}
    </>
  );
};

export default memo(ConversationStartersRow);
