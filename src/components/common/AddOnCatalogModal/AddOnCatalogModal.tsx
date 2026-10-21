import { FC, useCallback, useMemo, useState } from 'react';

import {
  CatalogSelectionMode,
  ListView,
  type CatalogItem,
  type ListViewColumnVisibility,
} from '@epam/ai-dial-catalog';
import { type CatalogEntityType } from '@epam/ai-dial-chat-shared';

import {
  CatalogPickerModal,
  type CatalogPickerModalLabels,
} from '@/components/common/CatalogPickerModal/CatalogPickerModal';
import { applyCatalogSelection } from '@/utils/apply-catalog-selection';

export interface AddOnCatalogModalLabels extends CatalogPickerModalLabels {
  selectAll: string;
  /** Accessible name of a row checkbox. */
  selectRow: (name: string) => string;
  /** Label of the logged-out badge on toolset avatars. */
  credentialsBadge?: string;
}

// The editor has no favorites, so the list drops the Favorite column.
const COLUMN_VISIBILITY: ListViewColumnVisibility = { favorite: () => false };

export interface AddOnCatalogModalProps {
  type: CatalogEntityType;
  /** The rows the user can pick from, already mapped and filtered. */
  items: CatalogItem[];
  /** Every attached id of the edited list; unlisted ones stay in place on Add. */
  attachedIds: string[];
  /** The attached ids that are checked when the popup opens. */
  initialCheckedIds: string[];
  labels: AddOnCatalogModalLabels;
  /** Called with the new full id list when the user confirms with Add. */
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}

/**
 * Add-on picker popup (Add toolset, Add agent): a catalog list with search,
 * From filter, sort and a checkbox per row; the checked set is committed only
 * with Add. Mount it only while open — search, filter, sort and the checked
 * set then start fresh every time it opens.
 */
export const AddOnCatalogModal: FC<AddOnCatalogModalProps> = ({
  type,
  items,
  attachedIds,
  initialCheckedIds,
  labels,
  onConfirm,
  onClose,
}) => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(initialCheckedIds));

  const listedIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);

  const { selectRow } = labels;
  const selectRowAriaLabel = useCallback((item: CatalogItem) => selectRow(item.name), [selectRow]);

  const handleConfirm = useCallback(
    () => onConfirm(applyCatalogSelection(attachedIds, checkedIds, listedIds)),
    [onConfirm, attachedIds, checkedIds, listedIds],
  );

  const renderList = (rows: CatalogItem[], query: string) => (
    // The list windows its rows against the nearest scrolling ancestor, so
    // this wrapper is the scroll container and the column header sticks to it.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ListView
        type={type}
        items={rows}
        query={query}
        ariaLabel={labels.catalog}
        selectionMode={CatalogSelectionMode.Multiple}
        selectedItemIds={checkedIds}
        onSelectionChange={setCheckedIds}
        selectRowAriaLabel={selectRowAriaLabel}
        selectAllAriaLabel={labels.selectAll}
        credentialsBadgeLoggedOutLabel={labels.credentialsBadge}
        stickyHeaderTop={0}
        columnVisibility={COLUMN_VISIBILITY}
      />
    </div>
  );

  return (
    <CatalogPickerModal
      items={items}
      labels={labels}
      onConfirm={handleConfirm}
      onClose={onClose}
      renderList={renderList}
    />
  );
};
