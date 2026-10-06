import { FC } from 'react';
import { SkillsSelector } from '@/components/common/SkillsSelector/SkillsSelector';

interface AgentSkillsFieldProps {
  value: string[];
  onChange: (ids: string[]) => void;
  readonly?: boolean;
  tooltip?: string;
  addButtonClassName?: string;
}

export const AgentSkillsField: FC<AgentSkillsFieldProps> = ({
  value,
  onChange,
  readonly,
  tooltip,
  addButtonClassName,
}) => {
  return (
    <SkillsSelector
      value={value}
      onChange={onChange}
      readonly={readonly}
      tooltip={tooltip}
      addButtonClassName={addButtonClassName}
    />
  );
};
