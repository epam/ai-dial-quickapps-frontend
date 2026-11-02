import { FC, lazy, memo, Suspense, useCallback, useState } from 'react';

import { AddOnRow } from '@/components/AddOns/AddOnRow/AddOnRow';
import { ApplicationEditorI18nKeys } from '@/constants/translation-keys';
import { useTranslation } from 'react-i18next';

import { KnowledgeBaseList } from '../KnowledgeBaseList/KnowledgeBaseList';

// The file manager library renders its table with the ui-kit Grid (ag-grid), so the popup loads
// on first open instead of with the editor.
const FileManagerModal = lazy(
  () => import('@/components/common/FileManagerModal/FileManagerModal'),
);

export interface KnowledgeBaseRowProps {
  files: string[];
  onAddFiles: (files: string[]) => void;
  onRemoveFile: (file: string) => void;
}

const KnowledgeBaseRow: FC<KnowledgeBaseRowProps> = ({ files, onAddFiles, onRemoveFile }) => {
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
        onAdd={handleOpen}
      >
        {isEmpty ? null : <KnowledgeBaseList files={files} onRemove={onRemoveFile} />}
      </AddOnRow>
      {isModalOpen && (
        <Suspense fallback={null}>
          <FileManagerModal isOpen initialFileIds={files} onClose={handleModalClose} />
        </Suspense>
      )}
    </>
  );
};

export default memo(KnowledgeBaseRow);
