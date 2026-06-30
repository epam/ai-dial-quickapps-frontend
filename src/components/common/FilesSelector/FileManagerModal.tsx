"use client";

import { type FC, useCallback, useEffect, useState } from "react";

import {
  ButtonVariant,
  DialButton,
  DialFile,
  DialFileManager,
  DialFileNodeType,
  DialPopup,
  PopupSize,
} from "@epam/ai-dial-ui-kit";

import { CommonI18nKeys, MarketplaceI18nKeys } from "@/constants/i18n";
import { useTranslation } from "@/hooks/useTranslation";
import { Translation } from "@/types/translation";
import { type DialFileMetadataItem, fetchDialFiles } from "@/utils/dialClient";

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: (fileIds: string[]) => void;
}

function flattenMetadata(
  items: DialFileMetadataItem[],
  parentFolderId = "files",
): DialFile[] {
  return items.flatMap((item) => {
    const path = `${parentFolderId}/${item.name}`;
    const dialFile: DialFile = {
      name: item.name,
      bucket: item.bucket ?? item.name,
      nodeType:
        item.nodeType === "ITEM"
          ? DialFileNodeType.ITEM
          : DialFileNodeType.FOLDER,
      contentType: item.contentType,
      contentLength: item.contentLength,
      path,
      folderId: parentFolderId,
    };
    return item.items?.length
      ? [dialFile, ...flattenMetadata(item.items, path)]
      : [dialFile];
  });
}

export const FileManagerModal: FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t: tCommon } = useTranslation(Translation.Common);
  const { t } = useTranslation(Translation.Marketplace);

  const [files, setFiles] = useState<DialFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState("files");
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPaths(new Set());
    setCurrentPath("files");
    setIsLoading(true);
    fetchDialFiles()
      .then((items) => setFiles(flattenMetadata(items)))
      .catch(() => setFiles([]))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleConfirm = useCallback(() => {
    const fileOnly = [...selectedPaths].filter((p) =>
      files.some((f) => f.path === p && f.nodeType === DialFileNodeType.ITEM),
    );
    onClose(fileOnly);
  }, [selectedPaths, files, onClose]);

  const handleCancel = useCallback(() => {
    onClose([]);
  }, [onClose]);

  const handlePathChange = useCallback((nextPath?: string) => {
    setCurrentPath(nextPath ?? "files");
  }, []);

  return (
    <DialPopup
      open={isOpen}
      header={t(MarketplaceI18nKeys.SelectDocuments)}
      size={PopupSize.Lg}
      onClose={handleCancel}
      footer={
        <div className="flex justify-end gap-2">
          <DialButton
            variant={ButtonVariant.Neutral}
            onClick={handleCancel}
            label={tCommon(CommonI18nKeys.Cancel)}
          />
          <DialButton
            variant={ButtonVariant.Primary}
            onClick={handleConfirm}
            label={tCommon(CommonI18nKeys.Attach)}
          />
        </div>
      }
    >
      <div className="h-[60vh] min-h-[300px]">
        <DialFileManager
          items={files}
          path={currentPath}
          filesLoading={isLoading}
          selectedPaths={selectedPaths}
          onSelectedPathsChange={setSelectedPaths}
          onPathChange={handlePathChange}
          gridOptions={{ filterable: false }}
        />
      </div>
    </DialPopup>
  );
};
