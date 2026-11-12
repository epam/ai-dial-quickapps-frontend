import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { FC, useCallback, useMemo } from 'react';

import { ApplicationEditorI18nKeys, ButtonsI18nKeys } from '@/constants/translation-keys';
import { useDataContext } from '@/context/DataContext';
import { useEntityDetails } from '@/hooks/use-entity-details';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useToolsetCredentials } from '@/hooks/use-toolset-credentials';
import { useTranslation } from 'react-i18next';
import { AddOnResolution } from '@/types/add-on-kind';
import {
  DialEntityType,
  type DialModel,
  type DialToolset,
  ToolsetAuthType,
} from '@/types/dial-entities';
import { getCatalogFolder, getEntityScopeInfo } from '@/utils/entity-scope';
import { getAddOnDisplay } from '@/utils/get-add-on-display';
import { getAddOnResolution } from '@/utils/get-add-on-kind';
import { mapInlineToolsetToCatalogItem } from '@/utils/map-inline-toolset-to-catalog-item';
import { mapAgentToCatalogItem } from '@/utils/map-agent-to-catalog-item';
import { mapToolsetToCatalogItem } from '@/utils/map-toolset-to-catalog-item';

import { AddOnDetailsPopup } from '@/components/common/AddOnDetailsPopup/AddOnDetailsPopup';

export interface ToolsetDetailsPopupProps {
  toolsetId: string;
  /**
   * The toolset as currently known to `DataContext` — passed on every render
   * so a login result shows at once. Undefined when it is no longer listed.
   */
  toolset?: DialToolset;
  /** The entry's saved config; an inline toolset (no catalog entity) shows its tools from it. */
  inlineConfig?: Record<string, unknown>;
  onRemove: (id: string) => void;
  onClose: () => void;
}

/**
 * A toolset's details — the catalog's About, Overview and Tools — plus
 * Log in / Log out and Delete, which detaches the toolset from this
 * application (the toolset itself is untouched).
 */
export const ToolsetDetailsPopup: FC<ToolsetDetailsPopupProps> = ({
  toolsetId,
  toolset,
  inlineConfig,
  onRemove,
  onClose,
}) => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage ?? i18n.language;
  const { userBucket } = useDataContext();
  const scopeLabels = useScopeLabels();
  const credentials = useToolsetCredentials(toolset);

  const { name, version, iconUrl } = getAddOnDisplay(toolsetId, toolset, language);
  const isAuthenticationRequired =
    toolset?.authSettings != null &&
    toolset.authSettings.authenticationType !== ToolsetAuthType.None;

  const folder = useMemo(
    () => getCatalogFolder(getEntityScopeInfo(toolsetId, userBucket), scopeLabels),
    [toolsetId, userBucket, scopeLabels],
  );

  // Credentials stay the listing's, which a login updates at once.
  const listingItem = useMemo(() => {
    if (toolset == null) return undefined;
    const options = { language, userBucket, scopeLabels };
    // An MCP-only application sits in this row but is still an application entity.
    if ((toolset.type as DialEntityType) === DialEntityType.Application) {
      return mapAgentToCatalogItem(toolset as unknown as DialModel, options);
    }
    return mapToolsetToCatalogItem(toolset, options);
  }, [toolset, language, userBucket, scopeLabels]);
  const { status, details, retry } = useEntityDetails(listingItem);
  const resolution = getAddOnResolution(toolset, toolsetId);
  const isInline = resolution === AddOnResolution.Inline;
  // An inline toolset is not a DIAL entity: its tools come from the saved config, with no request.
  const inlineItem = useMemo(
    () => (isInline ? mapInlineToolsetToCatalogItem(name, inlineConfig) : undefined),
    [isInline, name, inlineConfig],
  );
  const item = useMemo(
    () => (listingItem == null ? inlineItem : { ...listingItem, details }),
    [listingItem, inlineItem, details],
  );
  let unavailableText: string | undefined;
  if (resolution === AddOnResolution.NotFound) {
    unavailableText = t(ApplicationEditorI18nKeys.ToolsetsUnavailable);
  } else if (isInline && inlineItem == null) {
    unavailableText = t(ApplicationEditorI18nKeys.ToolsetsInlineNoDetails);
  }

  const handleDelete = useCallback(() => {
    onRemove(toolsetId);
    onClose();
  }, [onRemove, onClose, toolsetId]);

  return (
    <AddOnDetailsPopup
      entityType={CatalogEntityType.Toolset}
      name={name}
      version={version}
      iconUrl={iconUrl}
      folder={folder}
      credentials={toolset && isAuthenticationRequired ? credentials : undefined}
      item={item}
      detailsStatus={status}
      onRetry={retry}
      isAboutHidden={isInline}
      unavailableText={unavailableText}
      deleteLabel={t(ButtonsI18nKeys.Delete)}
      onDelete={handleDelete}
      onClose={onClose}
    />
  );
};
