import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import { AddOnCatalogModal, type AddOnCatalogModalLabels } from '../AddOnCatalogModal';

let status: 'idle' | 'loading' | 'ready' | 'error' = 'ready';
const refreshAll = vi.fn();

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? ''),
  }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({
    status,
    error: status === 'error' ? 'Network down' : null,
    refreshAll,
  }),
}));

/*
 * ag-grid needs layout jsdom doesn't have, and the From filter opens a
 * floating dropdown; both are replaced by plain controls with the same
 * contract. The list mirrors the catalog's multi-select semantics: a checked
 * id is appended, select-all covers the listed items and keeps hidden ones.
 */
vi.mock('@epam/ai-dial-catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@epam/ai-dial-catalog')>();
  return {
    ...actual,
    ListView: ({
      items,
      ariaLabel,
      selectedItemIds = new Set<string>(),
      onSelectionChange,
      selectRowAriaLabel,
      selectAllAriaLabel,
    }: {
      items: CatalogItem[];
      ariaLabel?: string;
      selectedItemIds?: ReadonlySet<string>;
      onSelectionChange?: (ids: Set<string>) => void;
      selectRowAriaLabel?: (item: CatalogItem) => string;
      selectAllAriaLabel?: string;
    }) => {
      const selectedListed = items.filter((item) => selectedItemIds.has(item.id)).length;
      const isAll = items.length > 0 && selectedListed === items.length;
      const toggle = (id: string) => {
        const next = new Set(selectedItemIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange?.(next);
      };
      const toggleAll = () => {
        const next = new Set(selectedItemIds);
        items.forEach((item) => (isAll ? next.delete(item.id) : next.add(item.id)));
        onSelectionChange?.(next);
      };
      return (
        <div role="grid" aria-label={ariaLabel}>
          <input
            type="checkbox"
            aria-label={selectAllAriaLabel}
            aria-checked={selectedListed > 0 && !isAll ? 'mixed' : isAll}
            checked={isAll}
            onChange={toggleAll}
          />
          {items.map((item) => (
            <div key={item.id} role="row" {...{ 'row-id': item.id }}>
              <input
                type="checkbox"
                aria-label={selectRowAriaLabel?.(item)}
                checked={selectedItemIds.has(item.id)}
                onChange={() => toggle(item.id)}
              />
              {`${item.name} | ${item.folder.join(' / ')}`}
            </div>
          ))}
        </div>
      );
    },
    Filter: ({
      isMyAppsActive,
      onMyAppsChange,
      defaultLabel,
      myAppsLabel,
    }: {
      isMyAppsActive?: boolean;
      onMyAppsChange?: (isActive: boolean) => void;
      defaultLabel?: string;
      myAppsLabel?: string;
    }) => (
      <fieldset aria-label={defaultLabel}>
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
        <span>{label}</span>
        {items.map((item) => (
          <button key={item.key} role="menuitemradio" onClick={item.onClick}>
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

const figma = makeItem('toolsets/public/figma', 'Figma', { updatedAt: 3 });
const jira = makeItem('toolsets/public/jira', 'Jira', { updatedAt: 2 });
const mine = makeItem('toolsets/me/notes', 'My notes', {
  updatedAt: 1,
  isMyApp: true,
  folder: ['Personal'],
});

const LABELS: AddOnCatalogModalLabels = {
  title: 'Add toolset',
  catalog: 'Toolsets catalog',
  search: 'Search toolsets...',
  loading: 'Loading toolsets…',
  failedToLoad: 'Failed to load toolsets',
  empty: 'No toolsets available',
  selectAll: 'Select all toolsets',
  selectRow: (name) => `Select ${name}`,
};

let root: Root;
let container: HTMLDivElement;
let items: CatalogItem[];
let onConfirm: Mock<(ids: string[]) => void>;
let onClose: Mock<() => void>;

const render = (attachedIds: string[] = [], initialCheckedIds = attachedIds) =>
  act(() =>
    root.render(
      <AddOnCatalogModal
        type={CatalogEntityType.Toolset}
        items={items}
        attachedIds={attachedIds}
        initialCheckedIds={initialCheckedIds}
        labels={LABELS}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    ),
  );

const getCheckbox = (name: string) =>
  container.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);

const click = (element?: Element | null) => {
  expect(element).toBeTruthy();
  act(() => (element as HTMLElement).click());
};

const getButton = (text: string) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === text);

const getRows = () =>
  [...container.querySelectorAll<HTMLElement>('[role="row"]')].map((row) => row.textContent);

const typeSearch = (text: string) => {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Search toolsets..."]',
  );
  if (!input) throw new Error('search input not found');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setValue?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  items = [figma, jira, mine];
  status = 'ready';
  refreshAll.mockReset();
  onConfirm = vi.fn();
  onClose = vi.fn();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('AddOnCatalogModal', () => {
  it('opens with the title, catalog heading, count, search, From, sort and list', () => {
    render();

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-label')).toBe('Add toolset');
    expect(dialog?.textContent).toContain('Toolsets catalog3');
    expect(container.querySelector('input[aria-label="Search toolsets..."]')).not.toBeNull();
    expect(container.querySelector('fieldset[aria-label="From"]')).not.toBeNull();
    expect(dialog?.textContent).toContain('Recently updated');
    expect(container.querySelector('[role="grid"]')?.getAttribute('aria-label')).toBe(
      'Toolsets catalog',
    );
    expect(getRows()).toEqual(['Figma | Organization', 'Jira | Organization', 'My notes | Personal']);
  });

  it('pre-checks the given ids and shows a mixed select-all', () => {
    render([jira.id]);

    expect(getCheckbox('Select Jira')?.checked).toBe(true);
    expect(getCheckbox('Select Figma')?.checked).toBe(false);
    expect(getCheckbox('Select all toolsets')?.getAttribute('aria-checked')).toBe('mixed');
  });

  it("keeps the other row's ids in place and appends new ones in check order", () => {
    // `agent-1` is attached but not listed here: it belongs to the Agents row.
    render(['agent-1', figma.id, jira.id], [figma.id, jira.id]);

    click(getCheckbox('Select Figma'));
    click(getCheckbox('Select My notes'));
    click(getButton('Add'));

    expect(onConfirm).toHaveBeenCalledWith(['agent-1', jira.id, mine.id]);
  });

  it('selects only the filtered rows with select-all and keeps hidden checked ones', () => {
    render([mine.id]);

    typeSearch('ji');
    expect(getRows()).toEqual(['Jira | Organization']);

    click(getCheckbox('Select all toolsets'));
    typeSearch('');
    click(getButton('Add'));

    expect(onConfirm).toHaveBeenCalledWith([mine.id, jira.id]);
  });

  it('narrows the rows and the count to the user’s own entries with "My"', () => {
    render();

    click(container.querySelector('fieldset[aria-label="From"] input'));

    expect(getRows()).toEqual(['My notes | Personal']);
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Toolsets catalog1');
  });

  it('discards changes on Cancel and on the close control', () => {
    render([figma.id]);

    click(getCheckbox('Select Figma'));
    click(getButton('Cancel'));
    click(container.querySelector('button[aria-label="Close dialog"]'));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows no results for a search without matches and keeps Add enabled', () => {
    render();

    typeSearch('zzz');

    expect(container.textContent).toContain('No results found');
    expect(getButton('Add')?.disabled).toBe(false);
  });

  it('shows the empty catalog state', () => {
    items = [];
    render();

    expect(container.textContent).toContain('No toolsets available');
  });

  it('shows a spinner and disables Add while data loads', () => {
    status = 'loading';
    render();

    expect(container.querySelector('[aria-label="Loading toolsets…"]')).not.toBeNull();
    expect(getButton('Add')?.disabled).toBe(true);
  });

  it('shows the load error with a Retry that reloads', () => {
    status = 'error';
    render();

    expect(container.textContent).toContain('Failed to load toolsets');
    expect(container.textContent).toContain('Network down');
    expect(getButton('Add')?.disabled).toBe(true);

    click(getButton('Retry'));

    expect(refreshAll).toHaveBeenCalledTimes(1);
  });
});
