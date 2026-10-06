import { FC } from 'react';
import { SkillsSelector } from '@/components/common/SkillsSelector/SkillsSelector';

interface AgentSkillsFieldProps {
  value: string[];
  onChange: (ids: string[]) => void;
  readonly?: boolean;
  tooltip?: string;
  isSelectModalOpen?: boolean;
  onSelectModalOpenChange?: (isOpen: boolean) => void;
}

export const AgentSkillsField: FC<AgentSkillsFieldProps> = (props) => <SkillsSelector {...props} />;
