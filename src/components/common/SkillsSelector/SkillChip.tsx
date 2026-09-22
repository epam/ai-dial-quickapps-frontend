'use client';
import { IconLayoutGrid } from '@tabler/icons-react';
import React from 'react';

import { EntityScopeLine } from '@/components/common/EntityScopeLine/EntityScopeLine';
import type { DialSkill } from '@/types/dial-entities';
import { getEntityNameFromId } from '@/utils/api';
import { DialTag, DialTooltip } from '@epam/ai-dial-ui-kit';

interface SkillChipTooltipContentProps {
  id: string;
  name: string;
  description?: string;
}

const SkillChipTooltipContent: React.FC<SkillChipTooltipContentProps> = ({
  id,
  name,
  description,
}) => (
  <div className="flex max-w-[440px] flex-col gap-1 px-2 py-1">
    <div className="dial-small-text flex min-w-0 flex-col">
      <span className="w-full truncate">{name}</span>
      {description && <span className="text-secondary">{description}</span>}
    </div>
    <EntityScopeLine id={id} className="border-t-0 pt-0" />
  </div>
);

interface SkillChipProps {
  id: string;
  item?: DialSkill;
  onRemove?: (id: string) => void;
  readonly?: boolean;
}

export const SkillChip: React.FC<SkillChipProps> = ({ id, item, onRemove, readonly }) => {
  const name = item?.name ?? getEntityNameFromId(id);

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onRemove?.(id);
  };

  return (
    <DialTooltip tooltip={<SkillChipTooltipContent id={id} name={name} description={item?.description} />}>
      <DialTag
        label={name}
        icon={<IconLayoutGrid size={16} stroke={1.5} />}
        closable={!readonly && !!onRemove}
        onRemove={handleRemove}
      />
    </DialTooltip>
  );
};
