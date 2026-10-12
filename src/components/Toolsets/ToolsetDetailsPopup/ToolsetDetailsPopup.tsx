import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { FC, useCallback, useMemo } from 'react';

import { QuickAppEditorI18nKeys } from '@/constants/i18n';
import { useDataContext } from '@/context/DataContext';
import { useEntityDetails } from '@/hooks/use-entity-details';
import { useScopeLabels } from '@/hooks/use-scope-labels';
import { useToolsetCredentials } from '@/hooks/use-toolset-credentials';
import { useTranslation } from '@/hooks/use-translation';
import { type DialToolset, ToolsetAuthType } from '@/types/dial-entities';
import { Translation } from '@/types/translation';
import { getCatalogFolder, getEntityScopeInfo } from '@/utils/entity-scope';
import { getAddOnDisplay } from '@/utils/get-add-on-display';
import { mapToolsetToCatalogItem } from '@/utils/map-toolset-to-catalog-item';

import { AddOnDetailsPopup } from '@/components/common/AddOnDetailsPopup/AddOnDetailsPopup';

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
 * A toolset's details — the catalog's About, Overview and Tools — plus
 * Log in / Log out and Delete, which detaches the toolset from this
 * application (the toolset itself is untouched).
 */
export const ToolsetDetailsPopup: FC<ToolsetDetailsPopupProps> = ({
  toolsetId,
  toolset,
  isReadonly,
  onRemove,
  onClose,
}) => {
  const { t, language } = useTranslation(Translation.QuickAppEditor);
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
  const listingItem = useMemo(
    () =>
      toolset == null
        ? undefined
        : mapToolsetToCatalogItem(toolset, { language, userBucket, scopeLabels }),
    [toolset, language, userBucket, scopeLabels],
  );
  const { status, details, retry } = useEntityDetails(listingItem);
  const item = useMemo(
    () => (listingItem == null ? undefined : { ...listingItem, details }),
    [listingItem, details],
  );

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
      credentials={toolset && isAuthenticationRequired && !isReadonly ? credentials : undefined}
      item={item}
      detailsStatus={status}
      onRetry={retry}
      unavailableText={toolset == null ? t(QuickAppEditorI18nKeys.ToolsetUnavailable) : undefined}
      isReadonly={isReadonly}
      deleteLabel={t(QuickAppEditorI18nKeys.RemoveAddOnFromApp)}
      onDelete={handleDelete}
      onClose={onClose}
    />
  );
};
