import { CredentialsBadge } from '@epam/ai-dial-catalog';
import { FC } from 'react';

import type { DialToolset } from '@/types/dial-entities';
import { mapToolsetCredentials } from '@/utils/map-toolset-to-catalog-item';

export interface ToolsetBadgeProps {
  toolset: Pick<DialToolset, 'id' | 'authSettings'>;
  /** Accessible label and tooltip of the warning icon. */
  label: string;
}

/**
 * The catalog's logged-out warning icon for a toolset avatar; renders nothing
 * when the toolset needs no authentication or is signed in. Kept in its own
 * module so callers can lazy-load it with the catalog bundle.
 */
export const ToolsetBadge: FC<ToolsetBadgeProps> = ({ toolset, label }) => (
  <CredentialsBadge credentials={mapToolsetCredentials(toolset)} loggedOutLabel={label} />
);
