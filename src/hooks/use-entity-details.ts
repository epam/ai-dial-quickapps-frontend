import type { CatalogItem, CatalogItemDetailsFetchResult } from '@epam/ai-dial-catalog';
import type { SkillFileContent } from '@epam/ai-dial-chat-hooks/skill-editor';
import { useCatalogItemDetails } from '@epam/ai-dial-chat-hooks/catalog';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAppContext } from '@/context/AppContext';
import { useDataContext } from '@/context/DataContext';
import { useCatalogDetailsLabels } from '@/hooks/use-catalog-details-labels';
import { DetailsStatus } from '@/types/entity-details';
import { createCatalogDetailsApi } from '@/utils/catalog-details-api';
import { mapSkillToMetadataDto } from '@/utils/map-skill-to-catalog-item';

export interface UseEntityDetailsResult {
  status: DetailsStatus;
  details?: CatalogItemDetailsFetchResult;
  retry: () => void;
  /**
   * Downloads the bytes (and MIME type, when known) of one file in the open
   * skill's package, for the Details tab file preview. Throws on failure.
   */
  onLoadSkillDetailsFile: (fileId: string) => Promise<SkillFileContent>;
}

interface DetailsState {
  /** The request this result belongs to — `${itemId}#${attempt}`. */
  requestKey: string;
  details?: CatalogItemDetailsFetchResult;
}

/**
 * Loads an add-on's catalog details — Overview, Pricing, Limits, Tools, or a
 * skill's content — through the chat catalog's own pipeline
 * (`useCatalogItemDetails`), so every tab holds what the catalog shows. With
 * no item (an entity no longer listed) nothing is requested. A response for
 * a previous item or attempt is dropped.
 */
export const useEntityDetails = (item?: CatalogItem): UseEntityDetailsResult => {
  const { settings } = useAppContext();
  const { skills } = useDataContext();
  const { mappers } = useCatalogDetailsLabels();
  const api = useMemo(() => createCatalogDetailsApi(), []);
  const skillDtos = useMemo(() => skills.map(mapSkillToMetadataDto), [skills]);

  const { onFetchDetails, onLoadSkillDetailsFile } = useCatalogItemDetails({
    api,
    skills: skillDtos,
    // Credentials come from the toolset listing, so the admin view is not
    // needed. The DIAL Core URL builds the Connect tab's endpoints.
    isAdmin: false,
    dialCoreExternalUrl: settings.dialCoreExternalUrl ?? null,
    skillOverviewLabels: mappers.skillOverview,
    promptOverviewLabels: mappers.promptOverview,
    deploymentLimitsLabels: mappers.deploymentLimits,
    entityDetailsLabels: mappers.entityDetails,
  });

  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<DetailsState | null>(null);

  // The effect re-runs on the item id only: a refreshed listing (e.g. after a
  // toolset login) hands over a new object for the same entity, which must
  // not refetch. The fetcher is read through a ref for the same reason.
  const itemRef = useRef(item);
  itemRef.current = item;
  const fetchRef = useRef(onFetchDetails);
  fetchRef.current = onFetchDetails;

  const itemId = item?.id;
  const requestKey = itemId == null ? null : `${itemId}#${attempt}`;

  useEffect(() => {
    const currentItem = itemRef.current;
    if (requestKey == null || currentItem == null) return undefined;

    let isCancelled = false;

    const load = async () => {
      // `onFetchDetails` reports failure as `undefined`; a throw is treated the same.
      let details: CatalogItemDetailsFetchResult | undefined;
      try {
        details = await fetchRef.current(currentItem);
      } catch {
        details = undefined;
      }
      if (!isCancelled) setResult({ requestKey, details });
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [requestKey]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const actions = { retry, onLoadSkillDetailsFile };
  if (requestKey == null) return { status: DetailsStatus.Idle, ...actions };
  if (result?.requestKey !== requestKey) return { status: DetailsStatus.Loading, ...actions };
  if (result.details == null) return { status: DetailsStatus.Error, ...actions };
  return { status: DetailsStatus.Ready, details: result.details, ...actions };
};
