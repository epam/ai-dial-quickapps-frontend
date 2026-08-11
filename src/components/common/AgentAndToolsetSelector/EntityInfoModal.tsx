'use client';
import { FC } from 'react';

import classNames from 'classnames';

import { ModelIcon } from '@/components/common/ModelIcon/ModelIcon';
import { TopicsLine } from '@/components/common/TopicsLine/TopicsLine';
import { CommonI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { getEntityStatus, getEntityStatusMessage } from '@/utils/get-entity-status';
import { DialPopup, PopupSize } from '@epam/ai-dial-ui-kit';

import type { ChipEntity } from './AgentAndToolsetChip';

interface EntityInfoModalProps {
  item: ChipEntity;
  onClose: () => void;
}

export const EntityInfoModal: FC<EntityInfoModalProps> = ({ item, onClose }) => {
  const { t } = useTranslation(Translation.Common);

  const name = item.name ?? item.id;
  const iconUrl = typeof item.iconUrl === 'string' ? (item.iconUrl as string) : undefined;
  const description =
    typeof item.description === 'string' ? (item.description as string) : undefined;
  const topics = (item.topics as string[] | undefined) ?? [];

  const status = getEntityStatus(item);
  const statusMessage = getEntityStatusMessage(status, false, t);

  const isApplication = item.type === 'application';
  const isModel = item.type === 'model';
  const entityTypeLabel = t(
    isModel
      ? CommonI18nKeys.ModelEntityType
      : isApplication
        ? CommonI18nKeys.AgentEntityType
        : CommonI18nKeys.ToolsetEntityType,
  );

  return (
    <DialPopup open header={t(CommonI18nKeys.Details)} size={PopupSize.Sm} onClose={onClose}>
      <div className="flex flex-col gap-3 px-6 py-4">
        <div className="flex items-start gap-3">
          <ModelIcon name={name} iconUrl={iconUrl} size={44} radius={12} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              className={classNames(
                'dial-caption-text mb-1 font-semibold uppercase tracking-[0.06em]',
                isModel ? 'text-warning' : isApplication ? 'text-success' : 'text-accent-primary',
              )}
            >
              {entityTypeLabel}
            </span>
            <span className="dial-body-semi-text truncate text-primary">{name}</span>
            {item.version && (
              <span className="dial-tiny-text truncate text-secondary">{item.version}</span>
            )}
          </div>
        </div>

        {statusMessage && <p className="dial-tiny-text text-error">{statusMessage}</p>}

        {description && <p className="dial-small-text text-secondary">{description}</p>}

        {topics.length > 0 && <TopicsLine topics={topics} />}
      </div>
    </DialPopup>
  );
};
