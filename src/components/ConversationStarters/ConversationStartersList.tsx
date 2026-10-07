import { DIAL_ICON_SIZE, DIAL_KIT_ICON_STROKE } from '@epam/ai-dial-ui-kit';
import { IconMessage } from '@tabler/icons-react';
import { FC } from 'react';

import type { StarterWithId } from '@/types/conversation-starters';

export interface ConversationStartersListProps {
  starters: StarterWithId[];
}

export const ConversationStartersList: FC<ConversationStartersListProps> = ({ starters }) => (
  <ul className="flex flex-col gap-3">
    {starters.map((starter) => (
      <li key={starter.id} className="flex min-w-0 items-start gap-2">
        <IconMessage
          size={DIAL_ICON_SIZE.SM}
          stroke={DIAL_KIT_ICON_STROKE}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-secondary"
        />
        <div className="flex min-w-0 flex-col">
          {starter.title.trim() && (
            <span className="dial-small-semi-text truncate text-primary">{starter.title}</span>
          )}
          {starter.text.trim() && (
            <span className="dial-tiny-text truncate text-secondary">{starter.text}</span>
          )}
        </div>
      </li>
    ))}
  </ul>
);
