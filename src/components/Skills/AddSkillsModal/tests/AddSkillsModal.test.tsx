import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import type { CatalogItem } from '@epam/ai-dial-catalog';
import type { DialSkill } from '@/types/dial-entities';

import { AddSkillsModal } from '../AddSkillsModal';

const USER_BUCKET = 'user-bucket-123';

let skills: DialSkill[] = [];
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
    skills,
    userBucket: USER_BUCKET,
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

const makeSkill = (id: string, name: string, overrides: Partial<DialSkill> = {}): DialSkill => ({
  id,
  reference: id,
  name,
  type: 'skill',
  ...overrides,
});

const webSearch = makeSkill('skills/public/web-search', 'Web Search', { updatedAt: 3 });
const userResearch = makeSkill('skills/public/user-research', 'User Research', { updatedAt: 2 });
const uxWriting = makeSkill('skills/public/ux-writing', 'UX writing', { updatedAt: 1 });
const mine = makeSkill(`skills/${USER_BUCKET}/mine`, 'My notes', { isMy: true, updatedAt: 0 });

let root: Root;
let container: HTMLDivElement;
let onConfirm: Mock<(ids: string[]) => void>;
let onClose: Mock<() => void>;

const render = (value: string[] = []) =>
  act(() => root.render(<AddSkillsModal value={value} onConfirm={onConfirm} onClose={onClose} />));

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
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Search skills..."]');
  if (!input) throw new Error('search input not found');
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setValue?.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  skills = [webSearch, userResearch, uxWriting, mine];
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

describe('AddSkillsModal', () => {
  it('opens "Add skill" with the catalog heading, count, search, From, sort and list', () => {
    render();

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-label')).toBe('Add skill');
    expect(dialog?.textContent).toContain('Skills catalog');
    expect(dialog?.textContent).toContain('4');
    expect(container.querySelector('input[aria-label="Search skills..."]')).not.toBeNull();
    expect(container.querySelector('fieldset[aria-label="From"]')).not.toBeNull();
    expect(dialog?.textContent).toContain('Recently updated');
    expect(container.querySelector('[role="grid"]')?.getAttribute('aria-label')).toBe(
      'Skills catalog',
    );
  });

  it('lists skills by most recently updated with their folder', () => {
    render();

    expect(getRows()).toEqual([
      'Web Search | Organization',
      'User Research | Organization',
      'UX writing | Organization',
      'My notes | Personal',
    ]);
  });

  it('pre-checks the attached skills and shows a mixed select-all', () => {
    render([userResearch.id, uxWriting.id]);

    expect(getCheckbox('Select User Research')?.checked).toBe(true);
    expect(getCheckbox('Select UX writing')?.checked).toBe(true);
    expect(getCheckbox('Select Web Search')?.checked).toBe(false);
    expect(getCheckbox('Select all skills')?.getAttribute('aria-checked')).toBe('mixed');
  });

  it('commits attached skills that stay checked first, then new ones in check order', () => {
    render([webSearch.id, userResearch.id]);

    click(getCheckbox('Select Web Search'));
    click(getCheckbox('Select My notes'));
    click(getCheckbox('Select UX writing'));
    click(getButton('Add'));

    expect(onConfirm).toHaveBeenCalledWith([userResearch.id, mine.id, uxWriting.id]);
  });

  it('keeps an attached skill that is missing from the catalog in place', () => {
    render([webSearch.id, 'skills/public/deleted', userResearch.id]);

    click(getCheckbox('Select Web Search'));
    click(getButton('Add'));

    expect(onConfirm).toHaveBeenCalledWith(['skills/public/deleted', userResearch.id]);
  });

  it('selects only the filtered rows with select-all and keeps hidden checked skills', () => {
    render([mine.id]);

    typeSearch('us');
    expect(getRows()).toEqual(['User Research | Organization']);

    click(getCheckbox('Select all skills'));
    typeSearch('');
    click(getButton('Add'));

    expect(onConfirm).toHaveBeenCalledWith([mine.id, userResearch.id]);
  });

  it('narrows the rows and the count to the user’s own skills with "My"', () => {
    render();

    click(container.querySelector('fieldset[aria-label="From"] input'));

    expect(getRows()).toEqual(['My notes | Personal']);
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Skills catalog1');
  });

  it('discards changes on Cancel and on the close control', () => {
    render([webSearch.id]);

    click(getCheckbox('Select Web Search'));
    click(getButton('Cancel'));
    click(container.querySelector('button[aria-label="Close dialog"]'));

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows no results for a search without matches and keeps Add enabled', () => {
    render([webSearch.id]);

    typeSearch('zzz');

    expect(container.textContent).toContain('No results found');
    expect(getButton('Add')?.disabled).toBe(false);
  });

  it('shows the empty catalog state', () => {
    skills = [];
    render();

    expect(container.textContent).toContain('No Agent Skills added');
  });

  it('shows a spinner and disables Add while skills load', () => {
    status = 'loading';
    render();

    expect(container.querySelector('[aria-label="Loading skills…"]')).not.toBeNull();
    expect(getButton('Add')?.disabled).toBe(true);
  });

  it('shows the load error with a Retry that reloads', () => {
    status = 'error';
    render();

    expect(container.textContent).toContain('Failed to load skills');
    expect(container.textContent).toContain('Network down');
    expect(getButton('Add')?.disabled).toBe(true);

    click(getButton('Retry'));

    expect(refreshAll).toHaveBeenCalledTimes(1);
  });
});
