import { getEntityNameFromId, getVersionFromId } from '@/utils/api';
import type { AddOnEntity } from '@/utils/get-add-on-kind';
import { getLocalizedText } from '@/utils/get-localized-text';
import { resolveIconUrl } from '@/utils/resolve-icon-url';

export interface AddOnDisplay {
  name: string;
  version?: string;
  iconUrl?: string;
}

/**
 * What a row item and a details popup show for an add-on entry: the entity's
 * localized name, version and icon, or — for an entry missing from the
 * catalog — names derived from its id.
 */
export const getAddOnDisplay = (
  id: string,
  entity: AddOnEntity | undefined,
  language: string,
): AddOnDisplay => {
  const fallbackName = getEntityNameFromId(id, { removeVersion: true });
  if (entity == null) return { name: fallbackName, version: getVersionFromId(id) };

  return {
    name: getLocalizedText(entity.name, language, fallbackName),
    version: entity.version,
    iconUrl: entity.iconUrl ? resolveIconUrl(entity.iconUrl) : undefined,
  };
};
