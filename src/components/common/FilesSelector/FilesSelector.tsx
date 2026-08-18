'use client';

import { IconPlus, IconTrashX } from '@tabler/icons-react';
import React, { type MouseEvent, useCallback, useState } from 'react';

import {
  ButtonAppearance,
  DialIconButton,
  DialLinkButton,
  DialNoDataContent,
  mergeClasses,
} from '@epam/ai-dial-ui-kit';

import { CommonI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { decodeApiUrl } from '@/utils/api';
import { getFileDirectoryPath } from '@/utils/dial-file-path';
import { getAttachmentIcon } from '@/utils/file-name';

import FileManagerModal from './FileManagerModal';

interface SelectedFileProps {
  document: string;
  isEven: boolean;
  readonly?: boolean;
  onRemove?: (document: string) => void;
}

const SelectedFile: React.FC<SelectedFileProps> = ({ document, isEven, readonly, onRemove }) => {
  const { t } = useTranslation(Translation.Common);
  const filePath = decodeApiUrl(document);
  const displayName = filePath.split('/').pop() ?? document;
  const directoryPath = getFileDirectoryPath(filePath);
  const removeFileLabel = t(CommonI18nKeys.RemoveFile);
  const icon = getAttachmentIcon(displayName);

  return (
    <div
      className={mergeClasses(
        'dial-small-text flex items-center gap-2 px-2 py-1',
        isEven ? 'bg-layer-base' : 'bg-layer-raised',
      )}
    >
      {icon && (
        <div className="shrink-0">
          {React.createElement(icon, {
            size: 18,
            className: 'text-secondary',
          })}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate" title={displayName}>
          {displayName}
        </div>
        <div className="dial-caption-text truncate text-secondary" title={directoryPath}>
          {directoryPath}
        </div>
      </div>
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
          <div className="flex max-h-[600px] flex-col overflow-y-auto rounded">
            {files.map((file, index) => (
              <SelectedFile
                key={file}
                document={file}
                isEven={index % 2 === 0}
                readonly={readonly}
                onRemove={onRemoveFile}
              />
            ))}
          </div>
        )}
      </div>
      <FileManagerModal isOpen={isModalOpen} initialFileIds={files} onClose={handleModalClose} />
    </div>
  );
};
