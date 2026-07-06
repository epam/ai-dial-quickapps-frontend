"use client";
import {
  IconAlertCircleFilled,
  IconChevronDown,
  IconCircleCheckFilled,
  IconPencilMinus,
  IconTrashX,
} from "@tabler/icons-react";
import classNames from "classnames";
import { FC, memo, useCallback, useState } from "react";

import { MarketplaceI18nKeys } from "@/constants/i18n";
import { useDataContext } from "@/context/DataContext";
import { useSkillValidation } from "@/hooks/useSkillValidation";
import { useTranslation } from "@/hooks/useTranslation";
import { SkillValidationStatus } from "@/types/skill-validation";
import { Translation } from "@/types/translation";
import { DialIconButton } from "@epam/ai-dial-ui-kit";

interface AgentSkillsItemProps {
  promptId: string;
  onDelete?: (promptId: string) => void;
  onEdit?: (promptId: string) => void;
  readonly?: boolean;
}

interface PromptFileContent {
  name?: string;
  description?: string;
  content?: string;
}

function getDisplayName(name: string): string {
  return name.replace(/\.json$/i, "").replace(/__[\d.]+$/, "");
}

function getFriendlyFolderPath(folderId: string): string {
  if (folderId === "prompts/public") return "Organization";
  if (folderId.startsWith("prompts/public/")) {
    const sub = folderId.slice("prompts/public/".length);
    return `Organization/${sub}`;
  }
  // personal: "prompts/{bucket}" or "prompts/{bucket}/sub/..."
  const parts = folderId.split("/");
  const sub = parts.slice(2).join("/");
  return sub ? `My prompts/${sub}` : "My prompts";
}

function promptPathUrl(promptId: string): string {
  const suffix = promptId.replace(/^prompts\//, "");
  const encoded = suffix.split("/").map(encodeURIComponent).join("/");
  return `/api/dial/v1/prompts/${encoded}`;
}

const AgentSkillsItem: FC<AgentSkillsItemProps> = ({
  promptId,
  onDelete,
  onEdit,
  readonly,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { promptsMap } = useDataContext();
  const prompt = promptsMap[promptId];

  const [isExpanded, setIsExpanded] = useState(false);
  const [promptContent, setPromptContent] = useState<PromptFileContent | null>(
    null,
  );
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [hasContentError, setHasContentError] = useState(false);

  const skillValidation = useSkillValidation(promptId);
  const isSkillInvalid = skillValidation.status === SkillValidationStatus.Invalid;
  const isSkillValidating =
    skillValidation.status === SkillValidationStatus.Validating;
  const isSkillValid = skillValidation.status === SkillValidationStatus.Valid;

  const rawName = prompt?.name ?? promptId.split("/").pop() ?? promptId;
  const displayName = getDisplayName(rawName);
  const rawFolderId =
    prompt?.folderId ?? promptId.split("/").slice(0, -1).join("/");
  const folderPath = getFriendlyFolderPath(rawFolderId);
  const isOwn = !promptId.startsWith("prompts/public/");
  const canEdit = isOwn && !readonly && !!onEdit;

  const handleToggleExpand = useCallback(async () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);
    if (nextExpanded && promptContent == null && !isContentLoading) {
      setIsContentLoading(true);
      setHasContentError(false);
      try {
        const res = await fetch(promptPathUrl(promptId));
        if (!res.ok) throw new Error(`${res.status}`);
        const text = await res.text();
        try {
          const data = JSON.parse(text) as PromptFileContent;
          setPromptContent(data);
        } catch {
          // Raw text response (e.g. markdown skill)
          setPromptContent({ content: text });
        }
      } catch {
        setHasContentError(true);
      } finally {
        setIsContentLoading(false);
      }
    }
  }, [isExpanded, promptContent, isContentLoading, promptId]);

  return (
    <div
      className="flex flex-col divide-y divide-tertiary bg-layer-3 py-2"
    >
      <div className="p-3">
        <div className="flex items-center gap-2">
          <DialIconButton
            className="flex size-5 h-full items-start"
            icon={
              <IconChevronDown
                size={20}
                className={classNames(
                  "transition-transform",
                  isExpanded && "rotate-180",
                )}
              />
            }
            onClick={handleToggleExpand}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="dial-small-text flex items-center gap-1.5 truncate font-medium text-primary">
              {displayName}
              {isSkillValid && (
                <IconCircleCheckFilled
                  size={14}
                  className="shrink-0 text-accent-secondary"
                />
              )}
            </span>
            {folderPath && (
              <span className="dial-tiny-text truncate text-secondary">
                {folderPath}
              </span>
            )}
          </div>

          {!readonly && (
            <div className="flex gap-2 text-secondary">
              {canEdit && (
                <DialIconButton
                  icon={<IconPencilMinus size={16} />}
                  onClick={() => onEdit(promptId)}
                />
              )}
              {onDelete && (
                <DialIconButton
                  icon={<IconTrashX size={16} />}
                  onClick={() => onDelete(promptId)}
                />
              )}
            </div>
          )}
        </div>

        {isContentLoading && (
          <div className="mt-2 flex justify-center py-1">
            <span className="dial-tiny-text text-secondary">Loading…</span>
          </div>
        )}

        {hasContentError && (
          <div
            className="mt-2 flex items-center gap-1 px-7 text-error"
          >
            <IconAlertCircleFilled size={16} className="shrink-0" />
            <span className="dial-tiny-text break-words">
              {t(MarketplaceI18nKeys.AgentSkillLoadError)}
            </span>
          </div>
        )}

        {isSkillValidating && (
          <div className="mt-2 flex justify-center py-1">
            <span className="dial-tiny-text text-secondary">Validating…</span>
          </div>
        )}

        {isSkillInvalid && (
          <div
            className="mt-2 flex items-center gap-1 px-7 text-error"
          >
            <IconAlertCircleFilled size={16} className="shrink-0" />
            <span className="dial-tiny-text break-words">
              {skillValidation.message ||
                t(MarketplaceI18nKeys.AgentSkillsInvalidError)}
            </span>
          </div>
        )}
      </div>

      {isExpanded && promptContent != null && (
        <div className="dial-tiny-text max-h-[160px] overflow-auto whitespace-pre-wrap break-words px-10 py-3 font-mono text-primary">
          {promptContent.content}
        </div>
      )}
    </div>
  );
};

export default memo(AgentSkillsItem);
