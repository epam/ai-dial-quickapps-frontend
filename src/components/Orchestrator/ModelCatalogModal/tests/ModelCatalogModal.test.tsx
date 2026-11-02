import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import {
  CatalogLoadStatus,
  type CatalogItem,
  type CatalogPickerModalProps,
} from '@epam/ai-dial-catalog';
import { CatalogEntityType } from '@epam/ai-dial-chat-shared';

import { click, getButton } from '@/test-utils/dom';
import { setupTestRoot } from '@/test-utils/test-root';
import { DialEntityType } from '@/types/dial-entities';
import type { DialModel } from '@/types/dial-entities';

import {
  ApplicationEditorI18nKeys,
  BasicI18nKeys,
  CatalogI18nKeys,
  DeploymentSelectorI18nKeys,
} from '@/constants/translation-keys';

import { ModelCatalogModal } from '../ModelCatalogModal';

const USER_BUCKET = 'user-bucket-123';

const { shell, SHARED } = vi.hoisted(() => ({
  shell: { props: undefined as unknown, visibleIds: undefined as string[] | undefined },
  SHARED: {
    labels: { cancel: 'cancel', add: 'add' },
    status: 'ready',
    error: 'chat-api error',
    onRetry: () => undefined,
  },
}));

let models: DialModel[] = [];

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ modelsWithFavorites: models, userBucket: USER_BUCKET }),
}));

vi.mock('@/hooks/use-catalog-picker-shared-props', () => ({
  useCatalogPickerSharedProps: () => SHARED,
}));

/*
 * The catalog's picker (search, filter, sort, states, buttons) and its list
 * (ag-grid, keyboard selection) are the library's and tested there. Here the
 * picker renders the list for `shell.visibleIds` — the rows a search or filter
 * would leave — and an Add button; the list renders a row per item.
 */
vi.mock('@epam/ai-dial-catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@epam/ai-dial-catalog')>();
  const ListView = ({
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
          data-id={item.id}
          aria-selected={item.id === selectedItemId}
          onClick={() => onItemClick?.(item)}
        >
          {`${item.name} ${item.version} | ${item.folder.join(' / ')}`}
        </div>
      ))}
    </div>
  );
  return {
    ...actual,
    CatalogPickerModal: (props: CatalogPickerModalProps) => {
      shell.props = props;
      const rows = shell.visibleIds
        ? props.items.filter((item) => shell.visibleIds?.includes(item.id))
        : props.items;
      return (
        <div>
          <ListView ariaLabel={props.labels.catalog} {...props.listProps} items={rows} />
          <button disabled={props.isConfirmDisabled} onClick={props.onConfirm}>
            Add
          </button>
        </div>
      );
    },
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

const getRow = (id: string) => dom.container.querySelector<HTMLElement>(`[data-id="${id}"]`);

const getSelectedRowIds = () =>
  [...dom.container.querySelectorAll('[role="row"][aria-selected="true"]')].map((row) =>
    row.getAttribute('data-id'),
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
        ApplicationEditorI18nKeys.OrchestratorCatalogTitle,
      );
      expect(getRows()).toEqual([
        `Gemini 1.0.3 | ${BasicI18nKeys.Organization}`,
        `Gemini 2.0.0 | ${BasicI18nKeys.Organization}`,
        `Anthropic Claude 1.0.0 | ${CatalogI18nKeys.FolderPersonal}`,
      ]);
    });

    it('labels the popup for models and hands over the close handler', () => {
      render();

      const props = shell.props as CatalogPickerModalProps;
      expect(props.labels).toEqual({
        ...SHARED.labels,
        title: ApplicationEditorI18nKeys.OrchestratorChangeModel,
        catalog: ApplicationEditorI18nKeys.OrchestratorCatalogTitle,
        search: ApplicationEditorI18nKeys.OrchestratorSearchPlaceholder,
        loading: DeploymentSelectorI18nKeys.Loading,
        failedToLoad: DeploymentSelectorI18nKeys.Error,
        empty: BasicI18nKeys.NotAvailable,
      });
      expect(props.onClose).toBe(onClose);
    });

    it('hands over the load state and lists models without favorites', () => {
      render();

      const props = shell.props as CatalogPickerModalProps;
      expect(props.status).toBe(CatalogLoadStatus.Ready);
      expect(props.error).toBe(SHARED.error);
      expect(props.onRetry).toBe(SHARED.onRetry);
      expect(props.listProps?.type).toBe(CatalogEntityType.Model);
      expect(props.listProps?.columnVisibility?.favorite?.(CatalogEntityType.Model)).toBe(false);
      expect(props.listProps?.columnVisibility?.folder?.(CatalogEntityType.Model)).toBe(true);
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

      expect(getRows()).toEqual([`Anthropic Claude 1.0.0 | ${CatalogI18nKeys.FolderPersonal}`]);
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
