'use client';

import { IconPlus, IconX, IconFile } from '@tabler/icons-react';
import React, { MouseEvent, useCallback } from 'react';

import { CommonI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { Translation } from '@/types/translation';
import { decodeApiUrl } from '@/utils/api';
import { DialNoDataContent } from '@epam/ai-dial-ui-kit';

interface Props {
  files: string[];
  readonly?: boolean;
  addBtnTooltip?: string;
  tooltip?: string;
  onRemoveFile?: (document: string) => void;
  onAddFiles?: (documents: string[]) => void;
}


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
  const displayName = decodeApiUrl(document).split('/').pop() ?? document;

  return (
    <div className="flex items-center gap-2 text-sm">
      <IconFile size={16} className="shrink-0 text-secondary" />
      <span className="min-w-0 flex-1 truncate" title={displayName}>
        {displayName}
      </span>
      {!readonly && onRemove && (
        <button
          type="button"
          onClick={() => onRemove(document)}
          className="shrink-0 text-secondary hover:text-primary"
          aria-label="Remove file"
        >
          <IconX size={14} />
        </button>
      )}
    </div>
  );
};

export const FilesSelector: React.FC<Props> = ({
  files,
  readonly,
  addBtnTooltip,
  onAddFiles,
  onRemoveFile,
}) => {
  const { t } = useTranslation(Translation.Common);

  const handleOpenFilesModal = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      // FileManagerModal will be wired in W1-5 when DataContext is available.
      // For now, trigger a no-op so the button is present for layout purposes.
      onAddFiles?.([]);
    },
    [onAddFiles],
  );

  return (
    <div className="relative grow space-y-4 divide-tertiary">
      <div className="flex flex-col">
        <div className="absolute right-0 top-[-26px]">
          <button
            type="button"
            disabled={readonly}
            onClick={handleOpenFilesModal}
            title={addBtnTooltip}
            className="flex items-center gap-1 text-xs text-accent-primary hover:text-accent-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconPlus size={18} />
            Add
          </button>
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
    </div>
  );
};
