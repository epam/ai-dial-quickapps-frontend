import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import { BasicI18nKeys, ButtonsI18nKeys, CatalogI18nKeys } from '@/constants/translation-keys';
import { click, getButton, typeInto } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';

import { CatalogPickerModal, type CatalogPickerModalLabels } from '../CatalogPickerModal';

let status: 'idle' | 'loading' | 'ready' | 'error' = 'ready';
const refreshAll = vi.fn();

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
      className,
      overlayClassName,
    }: {
      open: boolean;
      header: string;
      className?: string;
      overlayClassName?: string;
      children: ReactNode;
      mainButtons: { label: string; disabled?: boolean; onClick: () => void }[];
      onClose: () => void;
      closeAriaLabel: string;
    }) =>
      open ? (
        <div
          role="dialog"
          aria-label={header}
          className={className}
          data-overlay-class={overlayClassName}
        >
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

const dom = setupTestRoot();
let items: CatalogItem[];
let onConfirm: Mock<() => void>;
let onClose: Mock<() => void>;
let renderList: Mock<(rows: CatalogItem[], query: string) => ReactNode>;

const render = (props: { isConfirmDisabled?: boolean } = {}) =>
  dom.render(
    <CatalogPickerModal
      items={items}
      labels={LABELS}
      isConfirmDisabled={props.isConfirmDisabled}
      onConfirm={onConfirm}
      onClose={onClose}
      renderList={renderList}
    />,
  );

const getRows = () =>
  [...dom.container.querySelectorAll<HTMLElement>('[role="row"]')].map((row) => row.textContent);

const getDialogText = () => dom.container.querySelector('[role="dialog"]')?.textContent ?? '';

const typeSearch = (text: string) =>
  typeInto(
    dom.container.querySelector<HTMLInputElement>('input[aria-label="Search toolsets..."]'),
    text,
  );

const toggleCheckbox = (label: string) =>
  click(
    [...dom.container.querySelectorAll('label')]
      .find((el) => el.textContent === label)
      ?.querySelector('input'),
  );

beforeEach(() => {
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
});

describe('CatalogPickerModal', () => {
  describe('layout', () => {
    it('opens with the title, catalog heading, count, search, From, sort and list', () => {
      render();

      expect(dom.container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
        'Add toolset',
      );
      expect(getDialogText()).toContain('Toolsets catalog3');
      expect(dom.container.querySelector('input[aria-label="Search toolsets..."]')).not.toBeNull();
      expect(
        dom.container.querySelector(`fieldset[aria-label="${CatalogI18nKeys.BrowseSettingsFrom}"]`),
      ).not.toBeNull();
      expect(dom.container.querySelector('[data-testid="sort-label"]')?.textContent).toBe(
        CatalogI18nKeys.SortsUpdated,
      );
      expect(getRows()).toEqual(['Jira', 'Figma', 'My notes']);
    });

    // Issue #259: below `md` the popup is full-screen; from `md` up it keeps the dialog.
    it('fills a narrow viewport and keeps the centred dialog from md up', () => {
      render();

      const dialog = dom.container.querySelector('[role="dialog"]');
      expect(dialog?.getAttribute('data-overlay-class')).toBe('p-0 md:p-4 overflow-hidden!');
      expect(dialog?.className.split(' ')).toEqual(
        expect.arrayContaining(['h-full', 'rounded-none', 'md:h-auto', 'md:rounded-xl']),
      );
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
        [...dom.container.querySelectorAll('fieldset label')].map((label) => label.textContent),
      ).toEqual(['Design', 'Tracking', CatalogI18nKeys.BrowseSettingsMy]);

      toggleCheckbox('Design');

      expect(getRows()).toEqual(['Figma']);
    });

    it("keeps only the user's own entries when My is checked", () => {
      render();

      toggleCheckbox(CatalogI18nKeys.BrowseSettingsMy);

      expect(getRows()).toEqual(['My notes']);
      expect(getDialogText()).toContain('Toolsets catalog1');
    });

    it('sorts by name on request', () => {
      render();

      click(getButton(CatalogI18nKeys.SortNameAZ));

      expect(dom.container.querySelector('[data-testid="sort-label"]')?.textContent).toBe(
        CatalogI18nKeys.SortNameAZ,
      );
      expect(getRows()).toEqual(['Figma', 'Jira', 'My notes']);
    });

    it('shows no results for a search without matches and keeps Add enabled', () => {
      render();

      typeSearch('zzz');

      expect(dom.container.textContent).toContain(BasicI18nKeys.NoResults);
      expect(dom.container.querySelector('[role="grid"]')).toBeNull();
      expect(getDialogText()).toContain('Toolsets catalog0');
      expect(getButton(ButtonsI18nKeys.Add)?.disabled).toBe(false);
    });
  });

  describe('buttons', () => {
    it('confirms with Add', () => {
      render();

      click(getButton(ButtonsI18nKeys.Add));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('keeps Add disabled when the picker says so', () => {
      render({ isConfirmDisabled: true });

      click(getButton(ButtonsI18nKeys.Add));

      expect(getButton(ButtonsI18nKeys.Add)?.disabled).toBe(true);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('closes without confirming on Cancel and on the close control', () => {
      render();

      click(getButton(ButtonsI18nKeys.Cancel));
      click(dom.container.querySelector(`[aria-label="${BasicI18nKeys.CloseDialog}"]`));

      expect(onClose).toHaveBeenCalledTimes(2);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('starts fresh each time it is mounted again', () => {
      render();
      typeSearch('ji');

      dom.render(null);
      render();

      expect(getRows()).toHaveLength(3);
    });
  });

  describe('states', () => {
    it('shows the empty catalog state', () => {
      items = [];
      render();

      expect(dom.container.textContent).toContain(LABELS.empty);
      expect(renderList).not.toHaveBeenCalled();
    });

    it('shows a spinner and disables Add while data loads', () => {
      status = 'loading';
      render();

      expect(dom.container.querySelector('[aria-label="Loading toolsets…"]')).not.toBeNull();
      expect(getDialogText()).not.toContain('Toolsets catalog3');
      expect(getButton(ButtonsI18nKeys.Add)?.disabled).toBe(true);
    });

    it('shows the load error with a Retry that reloads', () => {
      status = 'error';
      render();

      expect(dom.container.textContent).toContain(LABELS.failedToLoad);
      expect(dom.container.textContent).toContain('Network down');
      expect(getButton(ButtonsI18nKeys.Add)?.disabled).toBe(true);

      click(getButton(ButtonsI18nKeys.Retry));

      expect(refreshAll).toHaveBeenCalledTimes(1);
    });
  });
});
