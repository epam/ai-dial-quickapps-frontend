'use client';
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { CommonI18nKeys } from '@/constants/i18n';
import { isToolsetId } from '@/utils/api';
import type { ChipEntity } from './AgentAndToolsetChip';

interface StatusMessageProps {
  id: string;
  item?: ChipEntity;
  isInSelectionList?: boolean;
  isCustomTool?: boolean;
  readonly?: boolean;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  id,
  item,
  isCustomTool,
}) => {
  const { t } = useTranslation(Translation.Common);

  const entityType = isToolsetId(id) ? 'toolset' : 'agent';

  if (isCustomTool) {
    return (
      <div className="text-sm text-secondary">
        {t(CommonI18nKeys.AgentNotAvailableOnMarketplace)}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-sm text-error">
        {t(CommonI18nKeys.NotAvailableEntityTypePleaseChange, { entityType })}
      </div>
    );
  }

  return null;
};
