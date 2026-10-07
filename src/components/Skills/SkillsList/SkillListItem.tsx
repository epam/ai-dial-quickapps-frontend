import { DeploymentIcon, ItemHeader } from '@epam/ai-dial-chat-shared';
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
}

/**
 * One attached skill in the Skills row: the same avatar + name + version as
 * the catalog list's Name cell, so the row and the picker read alike. A native
 * button because the kit has no clickable list item that holds this content
 * (its `Tag` is a single-line pill).
 */
export const SkillListItem: FC<SkillListItemProps> = ({ id, name, version, onClick }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);

  return (
    <button
      type="button"
      aria-label={t(QuickAppEditorI18nKeys.SkillDetails, { name })}
      className="flex w-full min-w-0 items-center gap-2.5 rounded-[10px] py-1 text-start outline-none hover:bg-control-accent-alpha focus-visible:outline focus-visible:outline-accent-focus"
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
  );
};
