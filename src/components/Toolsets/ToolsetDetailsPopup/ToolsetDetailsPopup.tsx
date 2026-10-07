import { EntityType, NoDataContent } from '@epam/ai-dial-ui-kit';
import { FC, useCallback, useMemo, useState } from 'react';

import { CommonI18nKeys, QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useToolsetTools } from '@/hooks/use-toolset-tools';
import { useTranslation } from '@/hooks/use-translation';
import { AddOnDetailsTabId } from '@/types/add-on-details';
import { type DialToolset, ToolsetAuthType } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { getCatalogFolder, getEntityScopeInfo } from '@/utils/entity-scope';
import { getAddOnDisplay } from '@/utils/get-add-on-display';
import { getEntityStatus, getEntityStatusMessage } from '@/utils/get-entity-status';
import { getToolsetOverviewRows } from '@/utils/map-toolset-to-catalog-item';

import { AddOnDetailsPopup } from '@/components/common/AddOnDetailsPopup/AddOnDetailsPopup';
import { EntityAboutTab } from '@/components/common/EntityAboutTab/EntityAboutTab';
import { OverviewList } from '@/components/common/OverviewList/OverviewList';
import { ToolsetBadge } from '@/components/Toolsets/ToolsetBadge/ToolsetBadge';

import { ToolsetCredentialsAction } from './ToolsetCredentialsAction';
import { ToolsetToolsTab } from './ToolsetToolsTab';

export interface ToolsetDetailsPopupProps {
  toolsetId: string;
  /**
   * The toolset as currently known to `DataContext` — passed on every render
   * so a login result shows at once. Undefined when it is no longer listed.
   */
  toolset?: DialToolset;
  isReadonly: boolean;
  onRemove: (id: string) => void;
  onClose: () => void;
}

/**
 * A toolset's details: About, Overview and its Tools, plus Log in / Log out
 * and Delete, which detaches the toolset from this application (the toolset
 * itself is untouched).
 */
export const ToolsetDetailsPopup: FC<ToolsetDetailsPopupProps> = ({
  toolsetId,
  toolset,
  isReadonly,
  onRemove,
  onClose,
}) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);
  const { t: tCommon } = useTranslation(Translation.Common);
  const { userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();
  // The tool list costs a call to the MCP server, so it loads only once the
  // Tools tab has been opened, and is kept while the popup stays open.
  const [hasOpenedTools, setHasOpenedTools] = useState(false);
  const tools = useToolsetTools(toolset ? toolsetId : undefined, hasOpenedTools);

  const { name, version, iconUrl } = getAddOnDisplay(toolsetId, toolset, language);
  const needsAuthentication =
    toolset?.authSettings != null &&
    toolset.authSettings.authenticationType !== ToolsetAuthType.None;

  const folder = useMemo(
    () => getCatalogFolder(getEntityScopeInfo(toolsetId, userBucket), scopeLabels),
    [toolsetId, userBucket, scopeLabels],
  );

  const overviewRows = useMemo(
    () =>
      toolset == null
        ? []
        : getToolsetOverviewRows(toolset, {
            language,
            userBucket,
            scopeLabels,
            labels: {
              authentication: t(QuickAppEditorI18nKeys.DetailsAuthentication),
              folder: t(QuickAppEditorI18nKeys.SkillFolder),
              updated: t(QuickAppEditorI18nKeys.SkillUpdated),
              version: t(QuickAppEditorI18nKeys.SkillVersion),
              oauth: t(QuickAppEditorI18nKeys.AuthTypeOAuth),
              apiKey: t(QuickAppEditorI18nKeys.ApiKeyLabel),
            },
          }),
    [toolset, language, userBucket, scopeLabels, t],
  );

  const banner =
    toolset == null
      ? undefined
      : getEntityStatusMessage(
          getEntityStatus(toolset, toolsetId),
          true,
          tCommon,
          tCommon(CommonI18nKeys.ToolsetEntityType),
        );

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === AddOnDetailsTabId.Tools) setHasOpenedTools(true);
  }, []);

  const handleDelete = useCallback(() => {
    onRemove(toolsetId);
    onClose();
  }, [onRemove, onClose, toolsetId]);

  const unavailable = <NoDataContent title={t(QuickAppEditorI18nKeys.ToolsetUnavailable)} />;

  const tabs = [
    {
      id: AddOnDetailsTabId.About,
      label: t(QuickAppEditorI18nKeys.AboutTab),
      panel: toolset ? (
        <EntityAboutTab description={toolset.description} topics={toolset.topics} />
      ) : (
        unavailable
      ),
    },
    {
      id: AddOnDetailsTabId.Overview,
      label: t(QuickAppEditorI18nKeys.SkillOverviewTab),
      panel: toolset ? <OverviewList rows={overviewRows} /> : unavailable,
    },
    {
      id: AddOnDetailsTabId.Tools,
      label: t(QuickAppEditorI18nKeys.ToolsTab),
      panel: toolset ? (
        <ToolsetToolsTab status={tools.status} names={tools.names} onRetry={tools.retry} />
      ) : (
        unavailable
      ),
    },
  ];

  return (
    <AddOnDetailsPopup
      entityType={EntityType.Toolset}
      typeLabel={t(QuickAppEditorI18nKeys.ToolsetTypeLabel)}
      name={name}
      version={version}
      iconUrl={iconUrl}
      folder={folder}
      avatarBadge={
        toolset && (
          <ToolsetBadge toolset={toolset} label={t(QuickAppEditorI18nKeys.ToolsetLoggedOutBadge)} />
        )
      }
      actions={
        toolset && needsAuthentication && !isReadonly ? (
          <ToolsetCredentialsAction toolset={toolset} />
        ) : undefined
      }
      banner={banner}
      tabs={tabs}
      isReadonly={isReadonly}
      deleteLabel={t(QuickAppEditorI18nKeys.RemoveSkillFromApp)}
      onTabChange={handleTabChange}
      onDelete={handleDelete}
      onClose={onClose}
    />
  );
};
