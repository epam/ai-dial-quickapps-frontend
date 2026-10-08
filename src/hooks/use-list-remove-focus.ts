import { RefObject, useCallback, useEffect, useRef } from 'react';

export interface UseListRemoveFocusResult {
  listRef: RefObject<HTMLUListElement | null>;
  /** Call right before removing an item; focus then moves to the list's first button. */
  markRemoval: () => void;
}

/**
 * Keeps focus inside an add-on list when an item is removed: the removed
 * item's buttons are gone, so after `value` changes focus moves to the
 * list's first remaining button instead of being dropped on the body.
 */
export const useListRemoveFocus = (value: unknown): UseListRemoveFocusResult => {
  const listRef = useRef<HTMLUListElement>(null);
  const shouldRefocusRef = useRef(false);

  useEffect(() => {
    if (!shouldRefocusRef.current) return;
    shouldRefocusRef.current = false;
    listRef.current?.querySelector('button')?.focus();
  }, [value]);

  const markRemoval = useCallback(() => {
    shouldRefocusRef.current = true;
  }, []);

  return { listRef, markRemoval };
};
