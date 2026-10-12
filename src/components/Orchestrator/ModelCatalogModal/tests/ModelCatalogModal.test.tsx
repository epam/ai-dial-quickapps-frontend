import { act } from 'react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import type { CatalogItem } from '@epam/ai-dial-catalog';

import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
import type { CatalogPickerModalProps } from '@/components/common/CatalogPickerModal/CatalogPickerModal';
import { DialEntityType } from '@/types/dial-entities';
import type { DialModel } from '@/types/dial-entities';

import { ModelCatalogModal } from '../ModelCatalogModal';

const USER_BUCKET = 'user-bucket-123';

const { shell } = vi.hoisted(() => ({
  shell: { props: undefined as unknown, visibleIds: undefined as string[] | undefined },
}));

let models: DialModel[] = [];

vi.mock('@/hooks/use-translation', () => import('@/test-utils/mock-translation'));
vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ modelsWithFavorites: models, userBucket: USER_BUCKET }),
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
        <button disabled={props.isConfirmDisabled} onClick={props.onConfirm}>
          Add
        </button>
      </div>
    );
  },
}));

// ag-grid needs layout jsdom doesn't have; rows carry `row-id` like
// ag-grid's do, for keyboard selection.
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
  };
});

const makeModel = (overrides: Partial<DialModel>): DialModel => ({
  id: 'models/gemini__1.0.3',
  reference: 'gemini',
  name: 'Gemini',
  type: DialEntityType.Model,
  version: '1.0.3',
  features: { tools: true },
  ...overrides,
});

const gemini = makeModel({});
const geminiV2 = makeModel({ id: 'models/gemini__2.0.0', version: '2.0.0' });
const claude = makeModel({
  id: `models/${USER_BUCKET}/claude__1.0.0`,
  name: 'Anthropic Claude',
  version: '1.0.0',
});
const noTools = makeModel({ id: 'models/no-tools__1.0.0', name: 'No tools', features: {} });
const agent = makeModel({
  id: 'applications/bucket/some-agent__1.0.0',
  name: 'Some agent',
  type: DialEntityType.Application,
});

const dom = setupTestRoot();
let onConfirm: Mock<(modelId: string) => void>;
let onClose: Mock<() => void>;

const render = (props: { value?: string } = {}) =>
  dom.render(
    <ModelCatalogModal value={props.value ?? gemini.id} onConfirm={onConfirm} onClose={onClose} />,
  );

const getRows = () =>
  [...dom.container.querySelectorAll<HTMLElement>('[role="row"]')].map((row) => row.textContent);

const getRow = (id: string) => dom.container.querySelector<HTMLElement>(`[row-id="${id}"]`);

const getSelectedRowIds = () =>
  [...dom.container.querySelectorAll('[role="row"][aria-selected="true"]')].map((row) =>
    row.getAttribute('row-id'),
  );

const getAddButton = () => getButton('Add');

beforeEach(() => {
  models = [gemini, geminiV2, claude, noTools, agent];
  shell.visibleIds = undefined;
  onConfirm = vi.fn<(modelId: string) => void>();
  onClose = vi.fn<() => void>();
});

describe('ModelCatalogModal', () => {
  describe('list', () => {
    it('lists only tool-supporting models, one row per version, with their folder', () => {
      render();

      expect(dom.container.querySelector('[role="grid"]')?.getAttribute('aria-label')).toBe(
        'Models catalog',
      );
      expect(getRows()).toEqual([
        'Gemini 1.0.3 | Organization',
        'Gemini 2.0.0 | Organization',
        'Anthropic Claude 1.0.0 | Personal',
      ]);
    });

    it('labels the popup for models and hands over the close handler', () => {
      render();

      const props = shell.props as CatalogPickerModalProps;
      expect(props.labels).toEqual({
        title: 'Change model',
        catalog: 'Models catalog',
        search: 'Search models…',
        loading: 'Loading models…',
        failedToLoad: 'Failed to load models',
        empty: 'N/A',
      });
      expect(props.onClose).toBe(onClose);
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

      click(getRow(geminiV2.id));

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

      click(getRow(geminiV2.id));
      click(getAddButton());

      expect(onConfirm).toHaveBeenCalledWith('models/gemini__2.0.0');
    });

    it('disables Add while the current value is not a selectable model', () => {
      render({ value: agent.id });

      expect(getSelectedRowIds()).toEqual([]);
      expect(getAddButton()?.disabled).toBe(true);
    });

    it('keeps a selection that search hides and still confirms it', () => {
      render();
      click(getRow(geminiV2.id));

      shell.visibleIds = [claude.id];
      render();
      click(getAddButton());

      expect(getRows()).toEqual(['Anthropic Claude 1.0.0 | Personal']);
      expect(getAddButton()?.disabled).toBe(false);
      expect(onConfirm).toHaveBeenCalledWith(geminiV2.id);
    });

    it('starts fresh each time it is mounted again', () => {
      render();
      click(getRow(claude.id));

      dom.render(null);
      render();

      expect(getSelectedRowIds()).toEqual([gemini.id]);
    });
  });
});
