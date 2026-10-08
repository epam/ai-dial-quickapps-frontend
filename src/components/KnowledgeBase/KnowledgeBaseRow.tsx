import { FC, memo, useCallback, useState } from 'react';

import { AddOnRow } from '@/components/AddOns/AddOnRow';
import FileManagerModal from '@/components/common/FilesSelector/FileManagerModal';
import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';

import { KnowledgeBaseList } from './KnowledgeBaseList';

export interface KnowledgeBaseRowProps {
  files: string[];
  isReadonly: boolean;
  tooltip?: string;
  onAddFiles: (files: string[]) => void;
  onRemoveFile: (file: string) => void;
}

const KnowledgeBaseRow: FC<KnowledgeBaseRowProps> = ({
  files,
  isReadonly,
  tooltip,
  onAddFiles,
  onRemoveFile,
}) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isEmpty = files.length === 0;

  const handleOpen = useCallback(() => setIsModalOpen(true), []);
  const handleModalClose = useCallback(
    (fileIds: string[]) => {
      setIsModalOpen(false);
      if (fileIds.length > 0) onAddFiles(fileIds);
    },
    [onAddFiles],
  );

  return (
    <>
      <AddOnRow
        label={t(QuickAppEditorI18nKeys.KnowledgeBase)}
        emptyDescription={t(QuickAppEditorI18nKeys.KnowledgeBaseDescription)}
        isEmpty={isEmpty}
        isAddDisabled={isReadonly}
        addTooltip={tooltip}
        onAdd={handleOpen}
      >
        {isEmpty ? null : (
          <KnowledgeBaseList files={files} onRemove={isReadonly ? undefined : onRemoveFile} />
        )}
      </AddOnRow>
      {isModalOpen && !isReadonly && (
        <FileManagerModal isOpen initialFileIds={files} onClose={handleModalClose} />
      )}
    </>
  );
};

export default memo(KnowledgeBaseRow);
