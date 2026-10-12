import {
  Breadcrumbs,
  DIAL_ICON_SIZE,
  DIAL_KIT_ICON_STROKE,
  ElementSize,
  FileIcon,
  GhostIconButton,
} from '@epam/ai-dial-ui-kit';
import { IconTrash } from '@tabler/icons-react';
import { FC, useCallback, useEffect, useMemo, useRef } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useAuthContext } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';
import { parseKnowledgeBaseItem } from '@/utils/knowledge-base-path';

export interface KnowledgeBaseListProps {
  files: string[];
  /** Omitted in a read-only app, which hides the remove buttons. */
  onRemove?: (file: string) => void;
}

export const KnowledgeBaseList: FC<KnowledgeBaseListProps> = ({ files, onRemove }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { user } = useAuthContext();
  const ownBucket = user?.bucket;
  const listRef = useRef<HTMLUListElement>(null);
  // Set when an item is removed, so focus lands on the list instead of being
  // lost with the removed button.
  const shouldRefocusListRef = useRef(false);

  const rootLabels = useMemo(
    () => ({
      personal: t(QuickAppEditorI18nKeys.KnowledgeBasePersonal),
      organization: t(QuickAppEditorI18nKeys.KnowledgeBaseOrganization),
      shared: t(QuickAppEditorI18nKeys.KnowledgeBaseShared),
    }),
    [t],
  );
  const items = useMemo(
    () =>
      files.map((file) => ({
        file,
        ...parseKnowledgeBaseItem(file, ownBucket, rootLabels),
      })),
    [files, ownBucket, rootLabels],
  );
  const breadcrumbItems = useMemo(
    () => items.map((item) => item.segments.map((label) => ({ label }))),
    [items],
  );

  useEffect(() => {
    if (!shouldRefocusListRef.current) return;
    shouldRefocusListRef.current = false;
    listRef.current?.querySelector('button')?.focus();
  }, [files]);

  const handleRemove = useCallback(
    (file: string) => {
      shouldRefocusListRef.current = true;
      onRemove?.(file);
    },
    [onRemove],
  );

  return (
    <ul ref={listRef} className="flex flex-col gap-1">
      {items.map((item, index) => (
        <li
          key={item.file}
          className="group flex min-w-0 items-center gap-2 rounded-[10px] px-2 py-1 hover:bg-control-accent-alpha"
        >
          <FileIcon type={item.type} name={item.name} decorative className="shrink-0" />
          <div className="min-w-0 flex-1">
            <Breadcrumbs
              items={breadcrumbItems[index]}
              ariaLabel={t(QuickAppEditorI18nKeys.KnowledgeBasePathLabel, { name: item.name })}
            />
          </div>
          {onRemove && (
            // Hidden with opacity, not `hidden`, so it stays in the tab order.
            <GhostIconButton
              size={ElementSize.Small}
              icon={<IconTrash size={DIAL_ICON_SIZE.SM} stroke={DIAL_KIT_ICON_STROKE} />}
              aria-label={t(QuickAppEditorI18nKeys.RemoveKnowledgeBaseItem, { name: item.name })}
              className="shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
              onClick={() => handleRemove(item.file)}
            />
          )}
        </li>
      ))}
    </ul>
  );
};
