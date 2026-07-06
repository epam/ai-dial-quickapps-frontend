import { IconBulb, IconChevronRight, IconFolder } from "@tabler/icons-react";
import classNames from "classnames";
import { FC, memo, useState } from "react";

import { DialPrompt } from "@/types/dial-entities";
import {
  getAllPromptIds,
  getDisplayName,
  matchesSearch,
  nodeHasMatch,
  PromptTreeNode,
} from "@/utils/prompt-tree";
import { DialCheckbox } from "@epam/ai-dial-ui-kit";

interface CollapsibleSectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}

const CollapsibleSectionHeader: FC<CollapsibleSectionHeaderProps> = ({
  title,
  isOpen,
  onToggle,
}) => (
  <button
    type="button"
    className="flex w-full items-center gap-1 px-3 py-2 hover:bg-layer-3"
    onClick={onToggle}
  >
    <IconChevronRight
      size={14}
      className={classNames(
        "shrink-0 text-secondary transition-transform",
        isOpen && "rotate-90",
      )}
    />
    <span className="dial-tiny-semi-text uppercase tracking-wide text-secondary">
      {title}
    </span>
  </button>
);

interface PromptItemProps {
  prompt: DialPrompt;
  isSelected: boolean;
  level: number;
  onToggle: (id: string) => void;
}

const PromptItem: FC<PromptItemProps> = ({
  prompt,
  isSelected,
  level,
  onToggle,
}) => (
  <div
    className={classNames(
      "group relative flex h-[32px] w-full shrink-0 cursor-pointer select-none items-center rounded border-s-2 border-s-transparent pe-3 hover:bg-accent-primary-alpha",
      isSelected && "bg-accent-primary-alpha",
    )}
    style={{ paddingInlineStart: `${level * 24 + 16}px` }}
    onClick={() => onToggle(prompt.id)}
  >
    <div className="flex size-full items-center gap-2">
      <div className="relative flex size-[18px] shrink-0 items-center justify-center">
        <IconBulb
          size={18}
          strokeWidth={1.5}
          className={classNames(
            "shrink-0 text-secondary",
            isSelected ? "opacity-0" : "group-hover:opacity-0",
          )}
        />
        <div
          className={classNames(
            "absolute inset-0 flex items-center justify-center",
            !isSelected && "opacity-0 group-hover:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <DialCheckbox
            id={prompt.id}
            checked={isSelected}
            onChange={() => onToggle(prompt.id)}
          />
        </div>
      </div>
      <span className="dial-small-text relative truncate text-start text-primary">
        {getDisplayName(prompt.name)}
      </span>
    </div>
  </div>
);

interface FolderNodeProps {
  node: PromptTreeNode;
  level: number;
  searchLower: string;
  selectedIds: string[];
  openFolderIds: Set<string>;
  onTogglePrompt: (id: string) => void;
  onToggleFolder: (folderId: string) => void;
  onSelectIds: (ids: string[], select: boolean) => void;
}

const FolderNodeView: FC<FolderNodeProps> = ({
  node,
  level,
  searchLower,
  selectedIds,
  openFolderIds,
  onTogglePrompt,
  onToggleFolder,
  onSelectIds,
}) => {
  const isOpen = openFolderIds.has(node.id);
  const visiblePrompts = searchLower
    ? node.prompts.filter((p) => matchesSearch(p, searchLower))
    : node.prompts;
  const visibleChildren = searchLower
    ? node.children.filter((c) => nodeHasMatch(c, searchLower))
    : node.children;

  const allIds = getAllPromptIds(node);
  const selectedCount = allIds.filter((id) => selectedIds.includes(id)).length;
  const isAllSelected = allIds.length > 0 && selectedCount === allIds.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < allIds.length;
  const hasAnySelection = isAllSelected || isIndeterminate;

  if (
    searchLower &&
    visiblePrompts.length === 0 &&
    visibleChildren.length === 0
  )
    return null;

  return (
    <div>
      <div
        className={classNames(
          "group relative flex h-[32px] w-full shrink-0 cursor-pointer select-none items-center rounded border-s-2 border-s-transparent pe-3 hover:bg-accent-primary-alpha",
          hasAnySelection && "bg-accent-primary-alpha",
        )}
        style={{ paddingInlineStart: `${level * 24 + 8}px` }}
        onClick={() => {
          onSelectIds(allIds, !isAllSelected);
          if (!isOpen) onToggleFolder(node.id);
        }}
      >
        <button
          type="button"
          className="flex shrink-0 items-center justify-center p-1"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFolder(node.id);
          }}
        >
          <IconChevronRight
            size={14}
            className={classNames(
              "shrink-0 text-secondary transition-transform",
              isOpen && "rotate-90",
            )}
          />
        </button>

        <div className="flex size-full items-center gap-2">
          <div className="relative flex size-[18px] shrink-0 items-center justify-center">
            <IconFolder
              size={18}
              strokeWidth={1.5}
              className={classNames(
                "shrink-0 text-secondary",
                hasAnySelection ? "opacity-0" : "group-hover:opacity-0",
              )}
            />
            <div
              className={classNames(
                "absolute inset-0 flex items-center justify-center",
                !hasAnySelection && "opacity-0 group-hover:opacity-100",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <DialCheckbox
                id={`folder-${node.id}`}
                checked={isAllSelected}
                indeterminate={isIndeterminate}
                onChange={() => onSelectIds(allIds, !isAllSelected)}
              />
            </div>
          </div>
          <span className="dial-small-text relative truncate text-start font-medium text-primary">
            {node.name}
          </span>
        </div>
      </div>

      {(isOpen || !!searchLower) && (
        <div>
          {visibleChildren.map((child) => (
            <FolderNodeView
              key={child.id}
              node={child}
              level={level + 1}
              searchLower={searchLower}
              selectedIds={selectedIds}
              openFolderIds={openFolderIds}
              onTogglePrompt={onTogglePrompt}
              onToggleFolder={onToggleFolder}
              onSelectIds={onSelectIds}
            />
          ))}
          {visiblePrompts.map((p) => (
            <PromptItem
              key={p.id}
              prompt={p}
              isSelected={selectedIds.includes(p.id)}
              level={level + 1}
              onToggle={onTogglePrompt}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export interface PromptTreeSectionProps {
  title: string;
  root: PromptTreeNode;
  searchLower: string;
  selectedIds: string[];
  openFolderIds: Set<string>;
  defaultOpen?: boolean;
  onTogglePrompt: (id: string) => void;
  onToggleFolder: (folderId: string) => void;
  onSelectIds: (ids: string[], select: boolean) => void;
}

const PromptTreeSection: FC<PromptTreeSectionProps> = ({
  title,
  root,
  searchLower,
  selectedIds,
  openFolderIds,
  defaultOpen = true,
  onTogglePrompt,
  onToggleFolder,
  onSelectIds,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const visibleRootPrompts = searchLower
    ? root.prompts.filter((p) => matchesSearch(p, searchLower))
    : root.prompts;
  const visibleRootFolders = searchLower
    ? root.children.filter((c) => nodeHasMatch(c, searchLower))
    : root.children;

  if (visibleRootPrompts.length === 0 && visibleRootFolders.length === 0)
    return null;

  const showContent = isOpen || !!searchLower;

  return (
    <div>
      <CollapsibleSectionHeader
        title={title}
        isOpen={showContent}
        onToggle={() => setIsOpen((v) => !v)}
      />
      {showContent && (
        <div>
          {visibleRootFolders.map((folder) => (
            <FolderNodeView
              key={folder.id}
              node={folder}
              level={0}
              searchLower={searchLower}
              selectedIds={selectedIds}
              openFolderIds={openFolderIds}
              onTogglePrompt={onTogglePrompt}
              onToggleFolder={onToggleFolder}
              onSelectIds={onSelectIds}
            />
          ))}
          {visibleRootPrompts.map((p) => (
            <PromptItem
              key={p.id}
              prompt={p}
              isSelected={selectedIds.includes(p.id)}
              level={0}
              onToggle={onTogglePrompt}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(PromptTreeSection);
