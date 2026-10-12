import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { CatalogItem } from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
import type { CatalogPickerModalProps } from '@/components/common/CatalogPickerModal/CatalogPickerModal';

import { AddOnCatalogModal, type AddOnCatalogModalLabels } from '../AddOnCatalogModal';

const { shell } = vi.hoisted(() => ({
  shell: { props: undefined as unknown, visibleIds: undefined as string[] | undefined },
}));

/*
 * The shell (search, filter, sort, states, buttons) is covered by its own
 * test; here it renders the list for `shell.visibleIds` — the rows a search
 * or filter would leave — and an Add button.
 */
vi.mock('@/components/common/CatalogPickerModal/CatalogPickerModal', () => ({
  CatalogPickerModal: (props: CatalogPickerModalProps) => {
    shell.props = props;
    const rows = shell.visibleIds
      ? props.items.filter((item) => shell.visibleIds?.includes(item.id))
      : props.items;
    return (
      <div>
        {props.renderList(rows, '')}
        <button onClick={props.onConfirm}>Add</button>
      </div>
    );
  },
}));

/*
 * ag-grid needs layout jsdom doesn't have; the list mirrors the catalog's
 * multi-select semantics: a checked id is appended, select-all covers the
 * listed items and keeps hidden ones.
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
            <div key={item.id} role="row">
              <input
                type="checkbox"
                aria-label={selectRowAriaLabel?.(item)}
                checked={selectedItemIds.has(item.id)}
                onChange={() => toggle(item.id)}
              />
              {item.name}
            </div>
          ))}
        </div>
      );
    },
  };
});

const makeItem = (id: string, name: string): CatalogItem => ({
  id,
  type: CatalogEntityType.Toolset,
  name,
  version: '',
  description: '',
  topics: [],
  folder: ['Organization'],
  lastUsed: '',
});

const figma = makeItem('toolsets/public/figma', 'Figma');
const jira = makeItem('toolsets/public/jira', 'Jira');
const mine = makeItem('toolsets/me/notes', 'My notes');

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

const dom = setupTestRoot();
let onConfirm: Mock<(ids: string[]) => void>;
let onClose: Mock<() => void>;

const render = (attachedIds: string[] = [], initialCheckedIds = attachedIds) =>
  dom.render(
    <AddOnCatalogModal
      type={CatalogEntityType.Toolset}
      items={[figma, jira, mine]}
      attachedIds={attachedIds}
      initialCheckedIds={initialCheckedIds}
      labels={LABELS}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );

const getCheckbox = (name: string) =>
  dom.container.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`);

const getAddButton = () => getButton('Add');

beforeEach(() => {
  shell.visibleIds = undefined;
  onConfirm = vi.fn();
  onClose = vi.fn();
});

describe('AddOnCatalogModal', () => {
  it('hands the items, labels and close handler to the picker shell', () => {
    render();

    const props = shell.props as CatalogPickerModalProps;
    expect(props.items).toEqual([figma, jira, mine]);
    expect(props.labels).toBe(LABELS);
    expect(props.onClose).toBe(onClose);
    expect(props.isConfirmDisabled).toBeFalsy();
    expect(dom.container.querySelector('[role="grid"]')?.getAttribute('aria-label')).toBe(
      'Toolsets catalog',
    );
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
    click(getAddButton());

    expect(onConfirm).toHaveBeenCalledWith(['agent-1', jira.id, mine.id]);
  });

  it('selects only the listed rows with select-all and keeps hidden checked ones', () => {
    shell.visibleIds = [jira.id];
    render([mine.id]);

    click(getCheckbox('Select all toolsets'));
    click(getAddButton());

    expect(onConfirm).toHaveBeenCalledWith([mine.id, jira.id]);
  });

  it('commits nothing until Add', () => {
    render([figma.id]);

    click(getCheckbox('Select Figma'));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
