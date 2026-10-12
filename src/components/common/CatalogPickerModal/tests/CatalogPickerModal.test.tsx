import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import { CatalogPickerModal, type CatalogPickerModalLabels } from '../CatalogPickerModal';

let status: 'idle' | 'loading' | 'ready' | 'error' = 'ready';
const refreshAll = vi.fn();

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({
    status,
    error: status === 'error' ? 'Network down' : null,
    refreshAll,
  }),
}));

// The From filter opens a floating dropdown; it is replaced by plain
// checkboxes with the same contract.
vi.mock('@epam/ai-dial-catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@epam/ai-dial-catalog')>();
  return {
    ...actual,
    Filter: ({
      values,
      checked,
      onChange,
      isMyAppsActive,
      onMyAppsChange,
      defaultLabel,
      myAppsLabel,
    }: {
      values?: Set<string>;
      checked: Set<string>;
      onChange: (next: Set<string>) => void;
      isMyAppsActive?: boolean;
      onMyAppsChange?: (isActive: boolean) => void;
      defaultLabel?: string;
      myAppsLabel?: string;
    }) => (
      <fieldset aria-label={defaultLabel}>
        {[...(values ?? [])].map((topic) => (
          <label key={topic}>
            <input
              type="checkbox"
              checked={checked.has(topic)}
              onChange={() => {
                const next = new Set(checked);
                if (next.has(topic)) next.delete(topic);
                else next.add(topic);
                onChange(next);
              }}
            />
            {topic}
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            checked={!!isMyAppsActive}
            onChange={() => onMyAppsChange?.(!isMyAppsActive)}
          />
          {myAppsLabel}
        </label>
      </fieldset>
    ),
  };
});

vi.mock('@epam/ai-dial-ui-kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@epam/ai-dial-ui-kit')>();
  return {
    ...actual,
    Popup: ({
      open,
      header,
      children,
      mainButtons,
      onClose,
      closeAriaLabel,
    }: {
      open: boolean;
      header: string;
      children: ReactNode;
      mainButtons: { label: string; disabled?: boolean; onClick: () => void }[];
      onClose: () => void;
      closeAriaLabel: string;
    }) =>
      open ? (
        <div role="dialog" aria-label={header}>
          <button aria-label={closeAriaLabel} onClick={() => onClose()} />
          {children}
          {mainButtons.map((button) => (
            <button key={button.label} disabled={button.disabled} onClick={button.onClick}>
              {button.label}
            </button>
          ))}
        </div>
      ) : null,
    ButtonDropdown: ({
      label,
      items,
    }: {
      label: string;
      items: { key: string; label: string; checked?: boolean; onClick: () => void }[];
    }) => (
      <div>
        <span data-testid="sort-label">{label}</span>
        {items.map((item) => (
          <button
            key={item.key}
            role="menuitemradio"
            aria-checked={!!item.checked}
            onClick={item.onClick}
          >
            {item.label}
          </button>
        ))}
      </div>
    ),
  };
});

const makeItem = (id: string, name: string, overrides: Partial<CatalogItem> = {}): CatalogItem => ({
  id,
  type: CatalogEntityType.Toolset,
  name,
  version: '',
  description: '',
  topics: [],
  folder: ['Organization'],
  lastUsed: '',
  ...overrides,
});

const figma = makeItem('toolsets/public/figma', 'Figma', { updatedAt: 2, topics: ['Design'] });
const jira = makeItem('toolsets/public/jira', 'Jira', { updatedAt: 3, topics: ['Tracking'] });
const mine = makeItem('toolsets/me/notes', 'My notes', { updatedAt: 1, isMyApp: true });

const LABELS: CatalogPickerModalLabels = {
  title: 'Add toolset',
  catalog: 'Toolsets catalog',
  search: 'Search toolsets...',
  loading: 'Loading toolsets…',
  failedToLoad: 'Failed to load toolsets',
  empty: 'No toolsets available',
};

let root: Root;
let container: HTMLDivElement;
let items: CatalogItem[];
let onConfirm: Mock<() => void>;
let onClose: Mock<() => void>;
let renderList: Mock<(rows: CatalogItem[], query: string) => ReactNode>;

const render = (props: { isConfirmDisabled?: boolean } = {}) =>
  act(() =>
    root.render(
      <CatalogPickerModal
        items={items}
        labels={LABELS}
        isConfirmDisabled={props.isConfirmDisabled}
        onConfirm={onConfirm}
        onClose={onClose}
        renderList={renderList}
      />,
    ),
  );

const getRows = () =>
  [...container.querySelectorAll<HTMLElement>('[role="row"]')].map((row) => row.textContent);

const getButton = (text: string) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === text);

const getDialogText = () => container.querySelector('[role="dialog"]')?.textContent ?? '';

const typeSearch = (text: string) => {
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Search toolsets..."]');
  if (!input) throw new Error('search input not found');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setValue?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const toggleCheckbox = (label: string) => {
  const input = [...container.querySelectorAll('label')]
    .find((el) => el.textContent === label)
    ?.querySelector('input');
  expect(input).toBeTruthy();
  act(() => input?.click());
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  items = [figma, jira, mine];
  status = 'ready';
  refreshAll.mockReset();
  onConfirm = vi.fn();
  onClose = vi.fn();
  renderList = vi.fn((rows: CatalogItem[]) => (
    <div role="grid">
      {rows.map((row) => (
        <div key={row.id} role="row">
          {row.name}
        </div>
      ))}
    </div>
  ));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('CatalogPickerModal', () => {
  describe('layout', () => {
    it('opens with the title, catalog heading, count, search, From, sort and list', () => {
      render();

      expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
        'Add toolset',
      );
      expect(getDialogText()).toContain('Toolsets catalog3');
      expect(container.querySelector('input[aria-label="Search toolsets..."]')).not.toBeNull();
      expect(container.querySelector('fieldset[aria-label="From"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="sort-label"]')?.textContent).toBe(
        'Recently updated',
      );
      expect(getRows()).toEqual(['Jira', 'Figma', 'My notes']);
    });
  });

  describe('search, filter and sort', () => {
    it('passes the searched rows and the query to the list and updates the count', () => {
      render();

      typeSearch('ji');

      expect(getRows()).toEqual(['Jira']);
      expect(renderList).toHaveBeenLastCalledWith([jira], 'ji');
      expect(getDialogText()).toContain('Toolsets catalog1');
    });

    it('offers the topics of the items and filters by them', () => {
      render();

      expect(
        [...container.querySelectorAll('fieldset label')].map((label) => label.textContent),
      ).toEqual(['Design', 'Tracking', 'My']);

      toggleCheckbox('Design');

      expect(getRows()).toEqual(['Figma']);
    });

    it("keeps only the user's own entries when My is checked", () => {
      render();

      toggleCheckbox('My');

      expect(getRows()).toEqual(['My notes']);
      expect(getDialogText()).toContain('Toolsets catalog1');
    });

    it('sorts by name on request', () => {
      render();

      act(() => getButton('Name A-Z')?.click());

      expect(container.querySelector('[data-testid="sort-label"]')?.textContent).toBe('Name A-Z');
      expect(getRows()).toEqual(['Figma', 'Jira', 'My notes']);
    });

    it('shows no results for a search without matches and keeps Add enabled', () => {
      render();

      typeSearch('zzz');

      expect(container.textContent).toContain('No results found');
      expect(container.querySelector('[role="grid"]')).toBeNull();
      expect(getDialogText()).toContain('Toolsets catalog0');
      expect(getButton('Add')?.disabled).toBe(false);
    });
  });

  describe('buttons', () => {
    it('confirms with Add', () => {
      render();

      act(() => getButton('Add')?.click());

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('keeps Add disabled when the picker says so', () => {
      render({ isConfirmDisabled: true });

      act(() => getButton('Add')?.click());

      expect(getButton('Add')?.disabled).toBe(true);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('closes without confirming on Cancel and on the close control', () => {
      render();

      act(() => getButton('Cancel')?.click());
      act(() => container.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')?.click());

      expect(onClose).toHaveBeenCalledTimes(2);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('starts fresh each time it is mounted again', () => {
      render();
      typeSearch('ji');

      act(() => root.render(null));
      render();

      expect(getRows()).toHaveLength(3);
    });
  });

  describe('states', () => {
    it('shows the empty catalog state', () => {
      items = [];
      render();

      expect(container.textContent).toContain('No toolsets available');
      expect(renderList).not.toHaveBeenCalled();
    });

    it('shows a spinner and disables Add while data loads', () => {
      status = 'loading';
      render();

      expect(container.querySelector('[aria-label="Loading toolsets…"]')).not.toBeNull();
      expect(getDialogText()).not.toContain('Toolsets catalog3');
      expect(getButton('Add')?.disabled).toBe(true);
    });

    it('shows the load error with a Retry that reloads', () => {
      status = 'error';
      render();

      expect(container.textContent).toContain('Failed to load toolsets');
      expect(container.textContent).toContain('Network down');
      expect(getButton('Add')?.disabled).toBe(true);

      act(() => getButton('Retry')?.click());

      expect(refreshAll).toHaveBeenCalledTimes(1);
    });
  });
});
