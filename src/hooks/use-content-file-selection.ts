import {
  CatalogContentNodeType,
  type CatalogItem,
  type CatalogContentTreeNode,
} from '@epam/ai-dial-catalog';
import { useCallback, useEffect, useState } from 'react';

import { findContentFileNode } from '@/utils/find-content-file-node';

export interface ContentFilePick {
  id: string;
  /** The tree node's basename, which names the preview and decides its type by extension. */
  name: string;
}

export interface UseContentFileSelectionResult {
  selectedFileId?: string;
  /** The picked package file; `null` while the base content (`SKILL.md`) is shown. */
  pickedFile: ContentFilePick | null;
  expandedFolderIds: ReadonlySet<string>;
  isFileSelectorOpen: boolean;
  onSelectFile: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onFileSelectorOpenChange: (isOpen: boolean) => void;
}

const collectFolderIds = (nodes: CatalogContentTreeNode[], into = new Set<string>()) => {
  nodes.forEach((node) => {
    if (node.type === CatalogContentNodeType.Folder) {
      into.add(node.id);
      collectFolderIds(node.items, into);
    }
  });
  return into;
};

/**
 * The selection state of the catalog `ContentTab` skill package file
 * selector: the details carry the base file's body, and picking another file
 * records it so its preview can render (loading belongs to the preview).
 * Picking the base file again clears the pick. Everything resets when the
 * item or its base file changes.
 */
export const useContentFileSelection = (
  item: CatalogItem | undefined,
): UseContentFileSelectionResult => {
  const promptContent = item?.details?.promptContent;
  const baseFileId = promptContent?.selectedFileId;
  const files = promptContent?.files;

  const [pickedFile, setPickedFile] = useState<ContentFilePick | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);

  useEffect(() => {
    setPickedFile(null);
    setExpandedFolderIds(collectFolderIds(files ?? []));
    setIsFileSelectorOpen(false);
    // Reset per item and base file only; a re-rendered listing must keep the pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, baseFileId]);

  const onToggleFolder = useCallback((folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const onSelectFile = useCallback(
    (fileId: string) => {
      if (fileId === baseFileId) {
        setPickedFile(null);
        return;
      }
      const node = findContentFileNode(files, fileId);
      setPickedFile({ id: fileId, name: node?.name ?? fileId.split('/').pop() ?? fileId });
    },
    [baseFileId, files],
  );

  return {
    selectedFileId: pickedFile?.id ?? baseFileId,
    pickedFile,
    expandedFolderIds,
    isFileSelectorOpen,
    onSelectFile,
    onToggleFolder,
    onFileSelectorOpenChange: setIsFileSelectorOpen,
  };
};
