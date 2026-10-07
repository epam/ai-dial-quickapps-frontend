import { MarkdownRenderer } from '@epam/ai-dial-chat-shared';
import { FC } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { Translation } from '@/types/translation';

import { TopicsLine } from '@/components/common/TopicsLine/TopicsLine';

export interface EntityAboutTabProps {
  /** Markdown description from the catalog listing. */
  description?: string;
  topics?: string[];
}

/** The About tab of a toolset or agent: its description as Markdown, then its topics. */
export const EntityAboutTab: FC<EntityAboutTabProps> = ({ description, topics = [] }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const content = description?.trim();

  return (
    <div className="flex flex-col gap-4">
      {content ? (
        <MarkdownRenderer content={content} containerClassName="text-primary" />
      ) : (
        <p className="dial-small-text text-secondary">{t(QuickAppEditorI18nKeys.NoDescription)}</p>
      )}
      {topics.length > 0 && <TopicsLine topics={topics} />}
    </div>
  );
};
