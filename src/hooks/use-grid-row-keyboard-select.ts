import { type KeyboardEvent, useCallback } from 'react';

const ACTIVATION_KEYS = new Set(['Enter', ' ']);

/**
 * Returns a `keydown` handler that selects the focused ag-grid row on Enter or
 * Space, as a click does. The catalog `ListView` only wires clicks, so the
 * handler goes on a wrapper around it and reads the row id ag-grid puts on
 * every row element (`row-id`, from the list's `getRowId`).
 */
export const useGridRowKeyboardSelect = (onSelect: (rowId: string) => void) =>
  useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!ACTIVATION_KEYS.has(event.key)) return;
      if (!(event.target instanceof Element)) return;

      const rowId = event.target.closest('[row-id]')?.getAttribute('row-id');
      if (rowId == null) return;

      event.preventDefault();
      onSelect(rowId);
    },
    [onSelect],
  );
