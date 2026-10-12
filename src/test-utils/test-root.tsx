import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach } from 'vitest';

export interface TestRoot {
  /** The element the root renders into; attached to `document.body`. */
  readonly container: HTMLDivElement;
  readonly root: Root;
  /** Renders inside `act`, so effects and state updates are flushed. */
  render: (ui: ReactNode) => void;
}

/**
 * Gives every test a fresh React root in a container attached to the
 * document, and unmounts and detaches it after the test. Call it once at the
 * top level of a test file (or a `describe`) and read `container` / `root`
 * inside the tests.
 */
export const setupTestRoot = (): TestRoot => {
  let container: HTMLDivElement | undefined;
  let root: Root | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = undefined;
    root = undefined;
  });

  const ensure = <T,>(value: T | undefined): T => {
    if (value === undefined) throw new Error('setupTestRoot: used outside a test');
    return value;
  };

  return {
    get container() {
      return ensure(container);
    },
    get root() {
      return ensure(root);
    },
    render: (ui) => act(() => ensure(root).render(ui)),
  };
};
