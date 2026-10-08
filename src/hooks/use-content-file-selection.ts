import {
  CatalogContentNodeType,
  CatalogContentPreviewType,
  type CatalogContentFilePreview,
  type CatalogItem,
  type CatalogContentTreeNode,
} from '@epam/ai-dial-catalog';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseContentFileSelectionResult {
  selectedFileId?: string;
  /** The picked file's body; `null` while the base content (`SKILL.md`) is shown. */
  filePreview: CatalogContentFilePreview | null;
  isFileLoading: boolean;
  expandedFolderIds: ReadonlySet<string>;
  isFileSelectorOpen: boolean;
  onSelectFile: (fileId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onFileSelectorOpenChange: (isOpen: boolean) => void;
}

interface PickedFile {
  id: string;
  /** `null` until loaded, or when loading failed. */
  preview: CatalogContentFilePreview | null;
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
 * The skill package file selector of the catalog `ContentTab`, as the catalog
 * `DetailsPanel` drives it: the details carry the base file's body, and
 * picking another file loads its text and shows it as Markdown. Picking the
 * base file again shows the base body without a request; a response for a
 * superseded pick is dropped. Everything resets when the item or its base
 * file changes.
 */
export const useContentFileSelection = (
  item: CatalogItem | undefined,
  onLoadContentFile: (fileId: string) => Promise<string | undefined>,
  errorLabel: string,
): UseContentFileSelectionResult => {
  const promptContent = item?.details?.promptContent;
  const baseFileId = promptContent?.selectedFileId;
  const files = promptContent?.files;

  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const generationRef = useRef(0);

  useEffect(() => {
    generationRef.current += 1;
    setPickedFile(null);
    setIsFileLoading(false);
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

  const loadFile = useCallback(
    async (fileId: string) => {
      const generation = ++generationRef.current;
      if (fileId === baseFileId) {
        setPickedFile(null);
        setIsFileLoading(false);
        return;
      }
      setPickedFile({ id: fileId, preview: null });
      setIsFileLoading(true);
      let preview: CatalogContentFilePreview | null = null;
      try {
        const text = await onLoadContentFile(fileId);
        if (text != null) preview = { type: CatalogContentPreviewType.Markdown, text };
      } catch {
        preview = null;
      } finally {
        if (generationRef.current === generation) {
          setPickedFile({ id: fileId, preview });
          setIsFileLoading(false);
        }
      }
    },
    [baseFileId, onLoadContentFile],
  );

  const onSelectFile = useCallback((fileId: string) => void loadFile(fileId), [loadFile]);

  // As in the catalog: while loading the tab shows its loading label over this.
  let filePreview: CatalogContentFilePreview | null = null;
  if (pickedFile != null) {
    filePreview = pickedFile.preview ?? { type: CatalogContentPreviewType.Text, text: errorLabel };
  }

  return {
    selectedFileId: pickedFile?.id ?? baseFileId,
    filePreview,
    isFileLoading,
    expandedFolderIds,
    isFileSelectorOpen,
    onSelectFile,
    onToggleFolder,
    onFileSelectorOpenChange: setIsFileSelectorOpen,
  };
};
