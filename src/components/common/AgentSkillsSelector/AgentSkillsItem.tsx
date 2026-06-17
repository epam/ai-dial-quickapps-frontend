'use client';
import React from 'react';

interface AgentSkillsItemProps {
  promptId: string;
  onDelete?: (promptId: string) => void;
  readonly?: boolean;
}

export const AgentSkillsItem: React.FC<AgentSkillsItemProps> = ({
  promptId,
  onDelete,
  readonly,
}) => {
  return (
    <div className="flex items-center justify-between rounded bg-layer-3 px-3 py-2">
      <span className="truncate text-sm">{promptId}</span>
      {!readonly && onDelete && (
        <button
          onClick={() => onDelete(promptId)}
          className="ml-2 shrink-0 text-secondary hover:text-error"
        >
          ✕
        </button>
      )}
    </div>
  );
};
