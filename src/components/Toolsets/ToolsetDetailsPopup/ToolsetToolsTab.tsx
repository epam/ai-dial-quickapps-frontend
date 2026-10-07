import { NeutralButton, NoDataContent, Search, Spinner } from '@epam/ai-dial-ui-kit';
import { FC, useCallback, useMemo, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useTranslation } from '@/hooks/use-translation';
import { ToolsStatus } from '@/types/toolset-tools';
import { Translation } from '@/types/translation';
import { filterToolNames } from '@/utils/map-toolset-to-catalog-item';

export interface ToolsetToolsTabProps {
  status: ToolsStatus;
  names: string[];
  onRetry: () => void;
}

/**
 * The Tools tab: a searchable list of the tool names the toolset exposes. The
 * fetch state lives in the popup, so switching tabs does not refetch.
 */
export const ToolsetToolsTab: FC<ToolsetToolsTabProps> = ({ status, names, onRetry }) => {
  const { t } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const [search, setSearch] = useState('');

  const filteredNames = useMemo(() => filterToolNames(names, search), [names, search]);
  const handleSearchChange = useCallback((next?: string) => setSearch(next ?? ''), []);

  if (status === ToolsStatus.Idle || status === ToolsStatus.Loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner size={32} fullWidth={false} ariaLabel={t(QuickAppEditorI18nKeys.LoadingTools)} />
      </div>
    );
  }

  if (status === ToolsStatus.Error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <NoDataContent title={t(QuickAppEditorI18nKeys.FailedToLoadTools)} />
        <NeutralButton label={t(QuickAppEditorI18nKeys.Retry)} onClick={onRetry} />
      </div>
    );
  }

  if (names.length === 0) {
    return <NoDataContent title={t(QuickAppEditorI18nKeys.NoToolsReported)} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="search">
        <Search
          value={search}
          onChange={handleSearchChange}
          placeholder={t(QuickAppEditorI18nKeys.SearchTools)}
          aria-label={t(QuickAppEditorI18nKeys.SearchTools)}
          clearLabel={tCommon(CommonI18nKeys.ClearSearch)}
        />
      </div>
      <p className="dial-tiny-text text-secondary" aria-live="polite">
        {t(QuickAppEditorI18nKeys.ToolsCount, { count: filteredNames.length })}
      </p>
      {filteredNames.length === 0 ? (
        <NoDataContent title={t(QuickAppEditorI18nKeys.NoResultsFound)} />
      ) : (
        <ul aria-label={t(QuickAppEditorI18nKeys.ToolsTab)} className="flex flex-col gap-1">
          {filteredNames.map((name) => (
            <li
              key={name}
              className="dial-small-text break-all rounded bg-layer-sunken px-2 py-1.5 text-start text-primary"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
