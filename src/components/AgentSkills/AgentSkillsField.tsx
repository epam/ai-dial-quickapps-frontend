'use client';
import { FC } from 'react';
import AgentSkillsSelector from '@/components/common/AgentSkillsSelector/AgentSkillsSelector';

interface AgentSkillsFieldProps {
  value: string[];
  onChange: (ids: string[]) => void;
  readonly?: boolean;
  tooltip?: string;
}

export const AgentSkillsField: FC<AgentSkillsFieldProps> = ({
  value,
  onChange,
  readonly,
  tooltip,
}) => {
  return (
    <AgentSkillsSelector value={value} onChange={onChange} readonly={readonly} tooltip={tooltip} />
  );
};
