"use client";

import { IconFile, IconPlus, IconTrashX } from "@tabler/icons-react";
import React, { type MouseEvent, useCallback, useState } from "react";

import {
  ButtonAppearance,
  DialIconButton,
  DialLinkButton,
  DialNoDataContent,
} from "@epam/ai-dial-ui-kit";

import { CommonI18nKeys } from "@/constants/i18n";
import { useTranslation } from "@/hooks/useTranslation";
import { Translation } from "@/types/translation";
import { decodeApiUrl } from "@/utils/api";

import FileManagerModal from "./FileManagerModal";

interface SelectedFileProps {
  document: string;
  readonly?: boolean;
  onRemove?: (document: string) => void;
}

const SelectedFile: React.FC<SelectedFileProps> = ({
  document,
  readonly,
  onRemove,
}) => {
  const { t } = useTranslation(Translation.Common);
  const displayName = decodeApiUrl(document).split("/").pop() ?? document;
  const removeFileLabel = t(CommonI18nKeys.RemoveFile);

  return (
    <div className="dial-small-text flex items-center gap-2">
      <IconFile size={16} className="shrink-0 text-secondary" />
      <span className="min-w-0 flex-1 truncate" title={displayName}>
        {displayName}
      </span>
      {!readonly && onRemove && (
        <DialIconButton
          icon={<IconTrashX size={16} />}
          onClick={() => onRemove(document)}
          appearance={ButtonAppearance.Link}
          title={removeFileLabel}
          aria-label={removeFileLabel}
        />
      )}
    </div>
  );
};

interface Props {
  files: string[];
  readonly?: boolean;
  addBtnTooltip?: string;
  tooltip?: string;
  onRemoveFile?: (document: string) => void;
  onAddFiles?: (documents: string[]) => void;
}

export const FilesSelector: React.FC<Props> = ({
  files,
  readonly,
  addBtnTooltip,
  onAddFiles,
  onRemoveFile,
}) => {
  const { t } = useTranslation(Translation.Common);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(
    (fileIds: string[]) => {
      setIsModalOpen(false);
      if (fileIds.length > 0) {
        onAddFiles?.(fileIds);
      }
    },
    [onAddFiles],
  );

  return (
    <div className="relative grow space-y-4 divide-tertiary">
      <div className="flex flex-col">
        <div className="absolute end-0 top-[-26px]">
          <DialLinkButton
            tooltipProps={{
              tooltip: addBtnTooltip ?? t(CommonI18nKeys.AddCommon),
            }}
            disabled={!!readonly}
            iconBefore={<IconPlus size={18} />}
            label={t(CommonI18nKeys.AddCommon)}
            onClick={handleOpenModal}
          />
        </div>
        {!files.length ? (
          <DialNoDataContent
            title={t(CommonI18nKeys.NoContextFilesAdded)}
            containerClassName="rounded border border-primary p-4"
          />
        ) : (
          <div className="flex flex-col gap-y-2 overflow-auto rounded border border-primary p-2">
            {files.map((file) => (
              <SelectedFile
                key={file}
                document={file}
                readonly={readonly}
                onRemove={onRemoveFile}
              />
            ))}
          </div>
        )}
      </div>
      <FileManagerModal
        isOpen={isModalOpen}
        initialFileIds={files}
        onClose={handleModalClose}
      />
    </div>
  );
};
