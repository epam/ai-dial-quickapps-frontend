import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
  GhostIconButton,
} from '@epam/ai-dial-ui-kit';
import { IconMessage, IconTrash } from '@tabler/icons-react';
import { FC, useCallback, useEffect, useRef } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import type { StarterWithId } from '@/types/conversation-starters';
import { Translation } from '@/types/translation';

export interface ConversationStartersListProps {
  starters: StarterWithId[];
  /** Omitted in a read-only app, which hides the remove buttons. */
  onRemove?: (id: string) => void;
}

export const ConversationStartersList: FC<ConversationStartersListProps> = ({
  starters,
  onRemove,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const listRef = useRef<HTMLUListElement>(null);
  // Set when a starter is removed, so focus lands on the list instead of being
  // lost with the removed button.
  const shouldRefocusListRef = useRef(false);

  useEffect(() => {
    if (!shouldRefocusListRef.current) return;
    shouldRefocusListRef.current = false;
    listRef.current?.querySelector('button')?.focus();
  }, [starters]);

  const handleRemove = useCallback(
    (id: string) => {
      shouldRefocusListRef.current = true;
      onRemove?.(id);
    },
    [onRemove],
  );

  return (
    <ul ref={listRef} className="flex flex-col gap-1">
      {starters.map((starter) => (
        <li
          key={starter.id}
          className="group flex min-w-0 items-start gap-2 rounded-[10px] px-2 py-1 hover:bg-control-accent-alpha"
        >
          <IconMessage
            size={DIAL_ICON_SIZE.SM}
            stroke={DIAL_KIT_ICON_STROKE}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-secondary"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            {starter.title.trim() && (
              <span className="dial-small-semi-text truncate text-primary">{starter.title}</span>
            )}
            {starter.text.trim() && (
              <span className="dial-tiny-text truncate text-secondary">{starter.text}</span>
            )}
          </div>
          {onRemove && (
            // Hidden with opacity, not `hidden`, so it stays in the tab order.
            <GhostIconButton
              size={ElementSize.Small}
              icon={<IconTrash size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
              aria-label={t(QuickAppEditorI18nKeys.RemoveStarter, {
                name: starter.title.trim() || starter.text.trim(),
              })}
              className="shrink-0 self-center opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
              onClick={() => handleRemove(starter.id)}
            />
          )}
        </li>
      ))}
    </ul>
  );
};
