import { FC, memo, useCallback, useState } from 'react';

import { AddOnRow } from '@/components/AddOns/AddOnRow/AddOnRow';
import FileManagerModal from '@/components/common/FileManagerModal/FileManagerModal';
import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';

import { KnowledgeBaseList } from '../KnowledgeBaseList/KnowledgeBaseList';

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
  const { t } = useTranslation();
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
        label={t(ApplicationEditorI18nKeys.KnowledgeBaseTitle)}
        emptyDescription={t(ApplicationEditorI18nKeys.KnowledgeBaseDescription)}
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
