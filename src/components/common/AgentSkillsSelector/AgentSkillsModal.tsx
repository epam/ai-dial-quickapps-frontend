"use client";
import {
  IconBulb,
  IconChevronRight,
  IconCircleCheckFilled,
  IconFolder,
  IconHelpCircle,
  IconPlus,
} from "@tabler/icons-react";
import classNames from "classnames";
import { FC, useCallback, useEffect, useMemo, useState } from "react";

import { MarketplaceI18nKeys } from "@/constants/i18n";
import { useDataContext } from "@/context/DataContext";
import { useTranslation } from "@/hooks/useTranslation";
import { DialPrompt } from "@/types/dial-entities";
import { Translation } from "@/types/translation";
import {
  DialCheckbox,
  DialFormItem,
  DialInput,
  DialLinkButton,
  DialNeutralButton,
  DialPopup,
  DialPrimaryButton,
  DialSearch,
  DialTextarea,
  DialTooltip,
} from "@epam/ai-dial-ui-kit";

// ── Tree helpers ──────────────────────────────────────────────────────────────

interface PromptTreeNode {
  id: string;
  name: string;
  prompts: DialPrompt[];
  children: PromptTreeNode[];
}

function buildPromptTree(
  prompts: DialPrompt[],
  bucketRoot: string,
): PromptTreeNode {
  const promptsByFolder = new Map<string, DialPrompt[]>();
  prompts.forEach((p) => {
    const list = promptsByFolder.get(p.folderId) ?? [];
    list.push(p);
    promptsByFolder.set(p.folderId, list);
  });

  const allFolderIds = new Set<string>();
  prompts.forEach((p) => {
    let fid = p.folderId;
    while (fid && fid !== bucketRoot) {
      allFolderIds.add(fid);
      const lastSlash = fid.lastIndexOf("/");
      if (lastSlash < 0) break;
      fid = fid.slice(0, lastSlash);
    }
  });

  const nodeMap = new Map<string, PromptTreeNode>();
  const root: PromptTreeNode = {
    id: bucketRoot,
    name: "",
    prompts: promptsByFolder.get(bucketRoot) ?? [],
    children: [],
  };
  nodeMap.set(bucketRoot, root);

  allFolderIds.forEach((fid) => {
    nodeMap.set(fid, {
      id: fid,
      name: fid.split("/").pop() ?? fid,
      prompts: promptsByFolder.get(fid) ?? [],
      children: [],
    });
  });

  allFolderIds.forEach((fid) => {
    const lastSlash = fid.lastIndexOf("/");
    const parentId = lastSlash > 0 ? fid.slice(0, lastSlash) : bucketRoot;
    const parent = nodeMap.get(parentId) ?? root;
    const child = nodeMap.get(fid)!;
    parent.children.push(child);
  });

  return root;
}

function matchesSearch(p: DialPrompt, lower: string): boolean {
  return (
    p.name.toLowerCase().includes(lower) || p.id.toLowerCase().includes(lower)
  );
}

function nodeHasMatch(node: PromptTreeNode, lower: string): boolean {
  if (node.prompts.some((p) => matchesSearch(p, lower))) return true;
  return node.children.some((c) => nodeHasMatch(c, lower));
}

function getDisplayName(name: string): string {
  return name.replace(/\.json$/i, "").replace(/__[\d.]+$/, "");
}

function promptPathUrl(promptId: string): string {
  const suffix = promptId.replace(/^prompts\//, "");
  const encoded = suffix.split("/").map(encodeURIComponent).join("/");
  return `/api/dial/v1/prompts/${encoded}`;
}

function getAllPromptIds(node: PromptTreeNode): string[] {
  const ids: string[] = node.prompts.map((p) => p.id);
  node.children.forEach((child) => {
    ids.push(...getAllPromptIds(child));
  });
  return ids;
}

// ── Section (collapsible) ─────────────────────────────────────────────────────

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
    <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
      {title}
    </span>
  </button>
);

// ── Sub-components ────────────────────────────────────────────────────────────

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
      <span className="relative truncate text-start text-sm text-primary">
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
          <span className="relative truncate text-start text-sm font-medium text-primary">
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

interface SectionProps {
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

const Section: FC<SectionProps> = ({
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

// ── Create-prompt form ────────────────────────────────────────────────────────

interface CreatePromptFormProps {
  onBack: () => void;
  onCreated: (newPromptId: string) => void;
  editPromptId?: string;
  onEdited?: () => void;
}

const CreatePromptForm: FC<CreatePromptFormProps> = ({
  onBack,
  onCreated,
  editPromptId,
  onEdited,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { refreshPrompts } = useDataContext();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editPromptId) return;
    let cancelled = false;
    setIsSaving(true);
    fetch(promptPathUrl(editPromptId))
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        try {
          const data = JSON.parse(text) as {
            name?: string;
            description?: string;
            content?: string;
          };
          setName(data.name ?? "");
          setDescription(data.description ?? "");
          setContent(data.content ?? "");
        } catch {
          // Raw text prompt (e.g. markdown skill)
          setContent(text);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load prompt.");
      })
      .finally(() => {
        if (!cancelled) setIsSaving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editPromptId]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();
    if (!trimmedName || !trimmedContent) return;

    setIsSaving(true);
    setError(null);

    try {
      if (editPromptId) {
        const res = await fetch(promptPathUrl(editPromptId), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editPromptId,
            folderId: editPromptId.slice(0, editPromptId.lastIndexOf("/")),
            name: trimmedName,
            description: description.trim(),
            content: trimmedContent,
          }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        await refreshPrompts();
        onEdited?.();
      } else {
        const bucketRes = await fetch("/api/dial/v1/bucket");
        if (!bucketRes.ok) throw new Error("Failed to fetch bucket");
        const { bucket } = (await bucketRes.json()) as { bucket: string };

        const newId = `prompts/${bucket}/${trimmedName}`;
        const fileName = encodeURIComponent(trimmedName);
        const res = await fetch(`/api/dial/v1/prompts/${bucket}/${fileName}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: newId,
            folderId: `prompts/${bucket}`,
            name: trimmedName,
            description: description.trim(),
            content: trimmedContent,
          }),
        });
        if (!res.ok) throw new Error(`Save failed: ${res.status}`);
        await refreshPrompts();
        onCreated(newId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save prompt");
    } finally {
      setIsSaving(false);
    }
  }, [
    name,
    description,
    content,
    editPromptId,
    refreshPrompts,
    onCreated,
    onEdited,
  ]);

  const isSaveDisabled = !name.trim() || !content.trim() || isSaving;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
      <DialFormItem label={t(MarketplaceI18nKeys.PromptName)}>
        <DialInput
          value={name}
          onChange={(val) => setName(val ?? "")}
          placeholder={t(MarketplaceI18nKeys.EnterPromptName)}
          containerClassName="w-full"
          autoFocus
        />
      </DialFormItem>

      <DialFormItem label={t(MarketplaceI18nKeys.PromptDescription)}>
        <DialTextarea
          value={description}
          onChange={(val) => setDescription(val)}
          placeholder={t(MarketplaceI18nKeys.EnterPromptDescription)}
          rows={3}
          containerClassName="w-full"
        />
      </DialFormItem>

      <DialFormItem
        label={
          <div className="flex items-center w-full justify-between">
            <span>
              {t(MarketplaceI18nKeys.PromptContentLabel)}
              <span className="ms-1 text-accent-primary">*</span>
            </span>
            <span className="flex items-center">
              <DialTooltip
                tooltip={t(MarketplaceI18nKeys.AgentSkillValidationPendingHint)}
              >
                <span className="me-2 flex cursor-help items-center gap-1.5 text-secondary">
                  <IconCircleCheckFilled size={16} className="opacity-50" />
                  <span className="text-xs">
                    {t(MarketplaceI18nKeys.AgentSkillValidationPending)}
                  </span>
                </span>
              </DialTooltip>
              <DialTooltip
                tooltip={
                  <span>
                    <a
                      href="https://agentskills.io/home"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline"
                    >
                      {t(MarketplaceI18nKeys.AgentSkills)}
                    </a>{" "}
                    {t(MarketplaceI18nKeys.AgentSkillHintBody)}{" "}
                    {t(MarketplaceI18nKeys.AgentSkillHintSeeExamples)}{" "}
                    <a
                      href="https://agentskills.io/specification#skill-md-format"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline"
                    >
                      {t(MarketplaceI18nKeys.AgentSkillHintHere)}
                    </a>
                    .
                  </span>
                }
              >
                <IconHelpCircle
                  size={16}
                  className="cursor-help text-secondary"
                />
              </DialTooltip>
            </span>
          </div>
        }
      >
        <DialTextarea
          value={content}
          onChange={(val) => setContent(val)}
          onBlur={(e) =>
            setContent((e.target as HTMLTextAreaElement).value.trim())
          }
          placeholder={t(MarketplaceI18nKeys.EnterPromptContent)}
          rows={10}
          containerClassName="w-full"
        />
      </DialFormItem>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex justify-end gap-2">
        <DialNeutralButton
          label={t(MarketplaceI18nKeys.BackToList)}
          onClick={onBack}
          disabled={isSaving}
        />
        <DialPrimaryButton
          label={t(MarketplaceI18nKeys.CreatePromptAction)}
          onClick={handleSave}
          disabled={isSaveDisabled}
        />
      </div>
    </div>
  );
};

// ── Main modal ────────────────────────────────────────────────────────────────

interface AgentSkillsModalProps {
  initialSelectedIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
  editPromptId?: string;
}

const AgentSkillsModal: FC<AgentSkillsModalProps> = ({
  initialSelectedIds,
  onClose,
  onConfirm,
  editPromptId,
}) => {
  const { t } = useTranslation(Translation.Marketplace);
  const { prompts } = useDataContext();

  const [view, setView] = useState<"list" | "create" | "edit">(
    editPromptId ? "edit" : "list",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(
    () => new Set(),
  );

  const orgPrompts = useMemo(
    () => prompts.filter((p) => p.id.startsWith("prompts/public/")),
    [prompts],
  );
  const personalPrompts = useMemo(
    () => prompts.filter((p) => !p.id.startsWith("prompts/public/")),
    [prompts],
  );

  const personalBucketRoot = useMemo(() => {
    const first = personalPrompts[0];
    if (!first) return "";
    const parts = first.id.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "";
  }, [personalPrompts]);

  const orgTree = useMemo(
    () => buildPromptTree(orgPrompts, "prompts/public"),
    [orgPrompts],
  );
  const personalTree = useMemo(
    () =>
      personalBucketRoot
        ? buildPromptTree(personalPrompts, personalBucketRoot)
        : null,
    [personalPrompts, personalBucketRoot],
  );

  const searchLower = searchTerm.toLowerCase();

  const handleTogglePrompt = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const handleSelectIds = useCallback((ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      if (select) {
        const toAdd = ids.filter((id) => !prev.includes(id));
        return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
      }
      return prev.filter((id) => !ids.includes(id));
    });
  }, []);

  const handleToggleFolder = useCallback((folderId: string) => {
    setOpenFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(selectedIds);
  }, [selectedIds, onConfirm]);

  const handleCreated = useCallback((newId: string) => {
    setSelectedIds((prev) => (prev.includes(newId) ? prev : [...prev, newId]));
    setView("list");
  }, []);

  const isEmpty = prompts.length === 0 && view === "list";

  return (
    <DialPopup
      open
      header={
        view === "create"
          ? t(MarketplaceI18nKeys.CreatePrompt)
          : view === "edit"
            ? t(MarketplaceI18nKeys.EditPrompt)
            : t(MarketplaceI18nKeys.AddAgentSkills)
      }
      onClose={onClose}
      footer={
        view === "list" ? (
          <div className="flex w-full justify-between px-6 py-4">
            <DialLinkButton
              iconBefore={<IconPlus size={18} />}
              label={t(MarketplaceI18nKeys.CreatePrompt)}
              onClick={() => setView("create")}
            />
            <DialPrimaryButton
              label={t(MarketplaceI18nKeys.SelectAgentSkills)}
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
            />
          </div>
        ) : null
      }
    >
      {view === "create" || view === "edit" ? (
        <CreatePromptForm
          onBack={view === "edit" ? onClose : () => setView("list")}
          onCreated={handleCreated}
          editPromptId={view === "edit" ? editPromptId : undefined}
          onEdited={view === "edit" ? onClose : undefined}
        />
      ) : (
        <div className="flex flex-col">
          <div className="px-6 pb-2 pt-2">
            <DialSearch
              placeholder={t(MarketplaceI18nKeys.SearchAgentSkills)}
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2">
            {isEmpty ? (
              <p className="py-10 text-center text-sm text-secondary">
                {t(MarketplaceI18nKeys.NoAgentSkillsAdded)}
              </p>
            ) : (
              <div className="flex flex-col">
                <Section
                  title={t(MarketplaceI18nKeys.OrganizationSection)}
                  root={orgTree}
                  searchLower={searchLower}
                  selectedIds={selectedIds}
                  openFolderIds={openFolderIds}
                  onTogglePrompt={handleTogglePrompt}
                  onToggleFolder={handleToggleFolder}
                  onSelectIds={handleSelectIds}
                />
                {personalTree && (
                  <Section
                    title={t(MarketplaceI18nKeys.MyPromptsSection)}
                    root={personalTree}
                    searchLower={searchLower}
                    selectedIds={selectedIds}
                    openFolderIds={openFolderIds}
                    onTogglePrompt={handleTogglePrompt}
                    onToggleFolder={handleToggleFolder}
                    onSelectIds={handleSelectIds}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </DialPopup>
  );
};

export default AgentSkillsModal;
