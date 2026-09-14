'use client';

import React from 'react';
import classNames from 'classnames';
import { IconFolder } from '@tabler/icons-react';
import { DialEllipsisTooltip } from '@epam/ai-dial-ui-kit';

import { CommonI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useTranslation } from '@/hooks/useTranslation';
import { ResourceScope } from '@/types/resource-scope';
import { Translation } from '@/types/translation';
import { getEntityScopeInfo } from '@/utils/entity-scope';

interface EntityScopeLineProps {
  /** Full entity id, e.g. `toolsets/public/folder1/my-toolset__1.0`. */
  id: string;
  className?: string;
}

const SCOPE_LABEL_KEYS = {
  [ResourceScope.Personal]: CommonI18nKeys.PersonalScope,
  [ResourceScope.Shared]: CommonI18nKeys.SharedScope,
  [ResourceScope.Organization]: CommonI18nKeys.OrganizationScope,
} as const;

/**
 * Scope label + normalized folder path for a DIAL entity, e.g.
 * "Organization / folder1 / folder2". Renders nothing when the scope cannot
 * be determined (custom tool ids, or a non-public bucket while the user's
 * bucket is still loading).
 */
export const EntityScopeLine: React.FC<EntityScopeLineProps> = ({ id, className }) => {
  const { t } = useTranslation(Translation.Common);
  const { userBucket } = useDataContext();

  const scopeInfo = getEntityScopeInfo(id, userBucket);
  if (scopeInfo == null) return null;

  const scopeLabel = t(SCOPE_LABEL_KEYS[scopeInfo.scope]);
  const text =
    scopeInfo.folderPath.length > 0
      ? `${scopeLabel} / ${scopeInfo.folderPath.join(' / ')}`
      : scopeLabel;

  return (
    <div
      className={classNames(
        'flex w-full items-center gap-1.5 border-t border-tertiary pt-2',
        className,
      )}
    >
      {/* Flex row follows the writing direction, so the icon sits at the
          inline start (left in LTR, right in RTL) without a mirror variant. */}
      <IconFolder size={14} strokeWidth={1.5} className="shrink-0 text-secondary" />
      <DialEllipsisTooltip
        text={text}
        className="dial-tiny-text min-w-0 flex-1 text-secondary"
      />
    </div>
  );
};
