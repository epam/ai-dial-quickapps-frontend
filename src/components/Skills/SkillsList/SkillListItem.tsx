import { DeploymentIcon, ItemHeader } from '@epam/ai-dial-chat-shared';
import {
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
  GhostIconButton,
} from '@epam/ai-dial-ui-kit';
import { IconTrash } from '@tabler/icons-react';
import { FC } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';

const AVATAR_SIZE = 36;

export interface SkillListItemProps {
  id: string;
  name: string;
  version?: string;
  onClick: (id: string) => void;
  /** Omitted in a read-only app, which hides the remove button. */
  onRemove?: (id: string) => void;
}

/**
 * One attached skill in the Skills row: the same avatar + name + version as
 * the catalog list's Name cell, so the row and the picker read alike, plus a
 * trash button revealed on hover or focus. The details control is a native
 * button because the kit has no clickable list item that holds this content
 * (its `Tag` is a single-line pill); the trash button sits beside it, since
 * buttons cannot nest.
 */
export const SkillListItem: FC<SkillListItemProps> = ({ id, name, version, onClick, onRemove }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <div className="group flex min-w-0 items-center gap-1 rounded-[10px] pe-1 hover:bg-control-accent-alpha">
      <button
        type="button"
        aria-label={t(QuickAppEditorI18nKeys.SkillDetails, { name })}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] py-1 text-start outline-none focus-visible:outline focus-visible:outline-accent-focus"
        onClick={() => onClick(id)}
      >
        <span aria-hidden="true" className="shrink-0">
          <DeploymentIcon
            size={AVATAR_SIZE}
            initialsName={name}
            styles={{ badgeClassName: 'rounded-[10px]' }}
          />
        </span>
        <ItemHeader
          title={name}
          postfix={version}
          titleClassName="dial-small-semi-text text-primary"
          postfixClassName="dial-tiny-text text-secondary"
          className="min-w-0 flex-1 items-baseline gap-1.5"
        />
      </button>
      {onRemove && (
        // Hidden with opacity, not `hidden`, so it stays in the tab order.
        <GhostIconButton
          size={ElementSize.Small}
          icon={<IconTrash size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
          aria-label={t(QuickAppEditorI18nKeys.RemoveSkill, { name })}
          className="shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={() => onRemove(id)}
        />
      )}
    </div>
  );
};
