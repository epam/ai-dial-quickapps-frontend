"use client";
import { IconTrashX } from "@tabler/icons-react";
import { FC, memo } from "react";
import { useDataContext } from "@/context/DataContext";
import { DialIconButton } from "@epam/ai-dial-ui-kit";

interface AgentSkillsItemProps {
  promptId: string;
  onDelete?: (promptId: string) => void;
  readonly?: boolean;
}

const AgentSkillsItem: FC<AgentSkillsItemProps> = ({
  promptId,
  onDelete,
  readonly,
}) => {
  const { promptsMap } = useDataContext();
  const prompt = promptsMap[promptId];
  const displayName = prompt?.name ?? promptId.split("/").pop() ?? promptId;
  const folderPath =
    prompt?.folderId ?? promptId.split("/").slice(0, -1).join("/");

  return (
    <div className="flex flex-col bg-layer-3 py-2" data-qa="agent-skill">
      <div className="flex items-center gap-2 px-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-primary">
            {displayName}
          </span>
          {folderPath && (
            <span className="truncate text-xs text-secondary">
              {folderPath}
            </span>
          )}
        </div>

        {!readonly && onDelete && (
          <DialIconButton
            icon={<IconTrashX size={16} />}
            onClick={() => onDelete(promptId)}
            data-qa="delete-skill"
          />
        )}
      </div>
    </div>
  );
};

export default memo(AgentSkillsItem);
