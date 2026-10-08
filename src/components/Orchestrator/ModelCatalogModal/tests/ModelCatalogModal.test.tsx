import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import type { CatalogItem } from '@epam/ai-dial-catalog';
import type { DialModel } from '@/types/dial-entities';

import { ModelCatalogModal } from '../ModelCatalogModal';

const USER_BUCKET = 'user-bucket-123';

let models: DialModel[] = [];
let status: 'idle' | 'loading' | 'ready' | 'error' = 'ready';
const refreshAll = vi.fn();

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({
    modelsWithFavorites: models,
    userBucket: USER_BUCKET,
    status,
    error: status === 'error' ? 'Network down' : null,
    refreshAll,
  }),
}));

// ag-grid needs layout jsdom doesn't have, and the From filter opens a
// floating dropdown; both are replaced by plain controls with the same
// contract. Rows carry `row-id` like ag-grid's do, for keyboard selection.
vi.mock('@epam/ai-dial-catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@epam/ai-dial-catalog')>();
  return {
    ...actual,
    ListView: ({
      items,
      selectedItemId,
      onItemClick,
      ariaLabel,
    }: {
      items: CatalogItem[];
      selectedItemId?: string;
      onItemClick?: (item: CatalogItem) => void;
      ariaLabel?: string;
    }) => (
      <div role="grid" aria-label={ariaLabel}>
        {items.map((item) => (
          <div
            key={item.id}
            role="row"
            {...{ 'row-id': item.id }}
            tabIndex={0}
            aria-selected={item.id === selectedItemId}
            onClick={() => onItemClick?.(item)}
          >
            {`${item.name} ${item.version} | ${item.folder.join(' / ')}`}
          </div>
        ))}
      </div>
    ),
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

const makeModel = (overrides: Partial<DialModel>): DialModel => ({
  id: 'models/gemini__1.0.3',
  reference: 'gemini',
  name: 'Gemini',
  type: 'model',
  version: '1.0.3',
  features: { tools: true },
  ...overrides,
});

const gemini = makeModel({
  topics: ['Business'],
  updatedAt: '2026-01-01T00:00:00.000Z',
});
const geminiV2 = makeModel({
  id: 'models/gemini__2.0.0',
  version: '2.0.0',
  topics: ['Business'],
  updatedAt: '2026-03-01T00:00:00.000Z',
});
const claude = makeModel({
  id: `models/${USER_BUCKET}/claude__1.0.0`,
  name: 'Anthropic Claude',
  version: '1.0.0',
  topics: ['Code'],
  updatedAt: '2026-02-01T00:00:00.000Z',
});
const noTools = makeModel({ id: 'models/no-tools__1.0.0', name: 'No tools', features: {} });
const agent = makeModel({
  id: 'applications/bucket/some-agent__1.0.0',
  name: 'Some agent',
  type: 'application',
});

let root: Root;
let container: HTMLDivElement;
let onConfirm: Mock<(modelId: string) => void>;
let onClose: Mock<() => void>;

const render = (props: { value?: string } = {}) =>
  act(() =>
    root.render(
      <ModelCatalogModal
        value={props.value ?? gemini.id}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    ),
  );

const getRows = () =>
  [...container.querySelectorAll<HTMLElement>('[role="row"]')].map((row) => row.textContent);

const getRow = (id: string) => container.querySelector<HTMLElement>(`[row-id="${id}"]`);

const getSelectedRowIds = () =>
  [...container.querySelectorAll('[role="row"][aria-selected="true"]')].map((row) =>
    row.getAttribute('row-id'),
  );

const getButton = (text: string) =>
  [...container.querySelectorAll('button')].find((button) => button.textContent === text);

const getAddButton = () => getButton('Add');

const getCountText = () => container.querySelector('[role="dialog"]')?.textContent ?? '';

const typeSearch = (text: string) => {
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Search models…"]');
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
  act(() => input?.click());
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  models = [gemini, geminiV2, claude, noTools, agent];
  status = 'ready';
  onConfirm = vi.fn<(modelId: string) => void>();
  onClose = vi.fn<() => void>();
  refreshAll.mockClear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('ModelCatalogModal', () => {
  describe('list', () => {
    it('lists only tool-supporting models, one row per version, most recently updated first', () => {
      render();

      expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
        'Change model',
      );
      expect(container.querySelector('[role="grid"]')?.getAttribute('aria-label')).toBe(
        'Models catalog',
      );
      expect(getRows()).toEqual([
        'Gemini 2.0.0 | Organization',
        `Anthropic Claude 1.0.0 | Personal`,
        'Gemini 1.0.3 | Organization',
      ]);
    });

    it('shows the number of listed rows next to the heading', () => {
      render();

      expect(getCountText()).toContain('Models catalog3');
    });
  });

  describe('selection', () => {
    it('pre-selects the current model and enables Add', () => {
      render();

      expect(getSelectedRowIds()).toEqual([gemini.id]);
      expect(getAddButton()?.disabled).toBe(false);
    });

    it('selects a clicked row without confirming it', () => {
      render();

      act(() => getRow(geminiV2.id)?.click());

      expect(getSelectedRowIds()).toEqual([geminiV2.id]);
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('selects the focused row on Enter or Space', () => {
      render();

      act(() => {
        getRow(claude.id)?.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
        );
      });
      expect(getSelectedRowIds()).toEqual([claude.id]);

      act(() => {
        getRow(geminiV2.id)?.dispatchEvent(
          new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
        );
      });
      expect(getSelectedRowIds()).toEqual([geminiV2.id]);
    });

    it('confirms the selected row with its full versioned id on Add', () => {
      render();

      act(() => getRow(geminiV2.id)?.click());
      act(() => getAddButton()?.click());

      expect(onConfirm).toHaveBeenCalledWith('models/gemini__2.0.0');
    });

    it('closes without confirming on Cancel and on the close button', () => {
      render();
      act(() => getRow(geminiV2.id)?.click());

      act(() => getButton('Cancel')?.click());
      act(() => container.querySelector<HTMLButtonElement>('[aria-label="Close dialog"]')?.click());

      expect(onClose).toHaveBeenCalledTimes(2);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('disables Add while the current value is not a selectable model', () => {
      render({ value: agent.id });

      expect(getSelectedRowIds()).toEqual([]);
      expect(getAddButton()?.disabled).toBe(true);
    });

    it('keeps a selection that search hides and still confirms it', () => {
      render();
      act(() => getRow(geminiV2.id)?.click());

      typeSearch('claude');
      act(() => getAddButton()?.click());

      expect(getRows()).toEqual(['Anthropic Claude 1.0.0 | Personal']);
      expect(onConfirm).toHaveBeenCalledWith(geminiV2.id);
    });

    it('starts fresh each time it is mounted again', () => {
      render();
      act(() => getRow(claude.id)?.click());
      typeSearch('claude');

      act(() => root.render(null));
      render();

      expect(getRows()).toHaveLength(3);
      expect(getSelectedRowIds()).toEqual([gemini.id]);
    });
  });

  describe('search, filter and sort', () => {
    it('narrows rows by name and restores them when the search is cleared', () => {
      render();

      typeSearch('GEM');
      expect(getRows()).toEqual(['Gemini 2.0.0 | Organization', 'Gemini 1.0.3 | Organization']);
      expect(getCountText()).toContain('Models catalog2');

      typeSearch('');
      expect(getRows()).toHaveLength(3);
    });

    it('offers the topics of the listed models and filters by them', () => {
      render();

      toggleCheckbox('Code');

      expect(getRows()).toEqual(['Anthropic Claude 1.0.0 | Personal']);
      expect(
        [...container.querySelectorAll('fieldset label')].map((label) => label.textContent),
      ).toEqual(['Business', 'Code', 'My']);
    });

    it("keeps only the user's own models when My is checked", () => {
      render();

      toggleCheckbox('My');

      expect(getRows()).toEqual(['Anthropic Claude 1.0.0 | Personal']);
    });

    it('sorts by Recently updated by default and by name on request', () => {
      render();

      expect(container.querySelector('[data-testid="sort-label"]')?.textContent).toBe(
        'Recently updated',
      );

      act(() => getButton('Name A-Z')?.click());

      expect(container.querySelector('[data-testid="sort-label"]')?.textContent).toBe('Name A-Z');
      expect(getRows()[0]).toBe('Anthropic Claude 1.0.0 | Personal');
    });

    it('shows the no-results state with Add disabled when nothing matches', () => {
      render({ value: agent.id });

      typeSearch('nothing like this');

      expect(container.textContent).toContain('No results found');
      expect(container.querySelector('[role="grid"]')).toBeNull();
      expect(getCountText()).toContain('Models catalog0');
      expect(getAddButton()?.disabled).toBe(true);
    });
  });

  describe('states', () => {
    it('shows a spinner and disables Add while models load', () => {
      models = [];
      status = 'loading';
      render();

      expect(container.querySelector('[aria-label="Loading models…"]')).not.toBeNull();
      expect(getAddButton()?.disabled).toBe(true);
    });

    it('shows the load error and retries', () => {
      status = 'error';
      render();

      expect(container.textContent).toContain('Failed to load models');
      expect(container.textContent).toContain('Network down');
      expect(getAddButton()?.disabled).toBe(true);

      act(() => getButton('Retry')?.click());
      expect(refreshAll).toHaveBeenCalled();
    });

    it('shows the not-available state when no model can be picked', () => {
      models = [noTools, agent];
      render();

      expect(container.textContent).toContain('N/A');
      expect(container.querySelector('[role="grid"]')).toBeNull();
    });
  });
});
