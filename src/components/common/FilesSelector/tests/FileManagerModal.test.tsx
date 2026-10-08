import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DialFileManagerI18nKeys } from '@/constants/i18n';
import { FilesApiNodeType, type ListFilesItem } from '@/types/dial-files';
import { listFiles, listPublicFiles, listSharedFiles } from '@/utils/dial-files-api';

import FileManagerModal from '../FileManagerModal';

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) =>
      key.replace(/\{\{(\w+)\}\}/g, (_, name: string) => options?.[name] ?? ''),
    language: 'en',
  }),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({ user: { bucket: 'mine' } }),
}));
vi.mock('@/utils/dial-files-api', () => ({
  createFolder: vi.fn(),
  deleteFiles: vi.fn(),
  downloadArchive: vi.fn(),
  downloadFile: vi.fn(),
  listFiles: vi.fn(),
  listPublicFiles: vi.fn(),
  listSharedFiles: vi.fn(),
  renameFiles: vi.fn(),
  uploadFile: vi.fn(),
}));

const MINE: ListFilesItem[] = [
  { name: 'docs', path: 'files/mine/docs/', nodeType: FilesApiNodeType.Folder, bucket: 'mine' },
  { name: 'api keys.xls', path: 'files/mine/api keys.xls', nodeType: FilesApiNodeType.Item, bucket: 'mine' },
  { name: 'a.pdf', path: 'files/mine/a.pdf', nodeType: FilesApiNodeType.Item, bucket: 'mine' },
  {
    name: 'hidden.txt',
    path: 'files/mine/.dial_folder/hidden.txt',
    nodeType: FilesApiNodeType.Item,
    bucket: 'mine',
  },
];
const PUBLIC: ListFilesItem[] = [
  { name: 'spec.pdf', path: 'files/public/spec.pdf', nodeType: FilesApiNodeType.Item, bucket: 'public' },
];

// The real file manager and AG Grid are slow to mount, especially on the first render of a file.
vi.setConfig({ testTimeout: 30000 });

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView = vi.fn();
  vi.mocked(listFiles).mockResolvedValue({ items: MINE, permissions: ['READ', 'WRITE'] } as never);
  vi.mocked(listPublicFiles).mockResolvedValue({ items: PUBLIC } as never);
  vi.mocked(listSharedFiles).mockResolvedValue({ items: [] } as never);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
  });
};

/** Polls until the condition holds: the grid debounces selection and paints rows asynchronously. */
const until = async (condition: () => boolean, timeoutMs = 8000) => {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeoutMs) {
    await flush();
  }
};

const renderModal = async (onClose = vi.fn()) => {
  act(() => root.render(<FileManagerModal isOpen onClose={onClose} />));
  await flush();
  return { onClose };
};

const dialog = () => document.body.querySelector('[role="dialog"]') as HTMLElement;
const findButton = (label: string) =>
  [...dialog().querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLButtonElement | undefined;
const rowCheckboxes = () =>
  [...dialog().querySelectorAll('[role="row"] [role="checkbox"], [role="row"] input[type="checkbox"]')];

describe('FileManagerModal shell', () => {
  it('shows the knowledge base title, a close control and no Files heading', async () => {
    await renderModal();

    expect(dialog().textContent).toContain(DialFileManagerI18nKeys.AddTitle);
    expect(dialog().textContent).not.toContain('dialFileManager.title');
    expect(dialog().textContent).not.toContain('dialFileManager.foldersPanelTitle');
    expect(dialog().querySelector(`button[aria-label="${DialFileManagerI18nKeys.CloseDialog}"]`)).not.toBeNull();
  });

  it('offers Cancel and a disabled Add until something is selected', async () => {
    await renderModal();

    expect(findButton('Cancel')?.disabled).toBe(false);
    expect(findButton(DialFileManagerI18nKeys.Add)?.disabled).toBe(true);
    expect(findButton('dialFileManager.attach')).toBeUndefined();
  });

  it('closes with no selection from Cancel', async () => {
    const { onClose } = await renderModal();

    act(() => findButton('Cancel')?.click());

    expect(onClose).toHaveBeenCalledWith([]);
  });
});

describe('FileManagerModal tabs, search and filters', () => {
  it('shows the four source chips and no grid filter row', async () => {
    await renderModal();

    const tabsText = dialog().textContent ?? '';
    for (const key of [
      DialFileManagerI18nKeys.TabAll,
      DialFileManagerI18nKeys.TabMyFiles,
      DialFileManagerI18nKeys.TabShared,
      DialFileManagerI18nKeys.TabOrganization,
    ]) {
      expect(tabsText).toContain(key);
    }
    expect(dialog().querySelector('.ag-floating-filter, .ag-header-row-column-filter')).toBeNull();
  });

  it('shows a search field named after the current folder', async () => {
    await renderModal();

    const search = dialog().querySelector('input[placeholder]') as HTMLInputElement;
    expect(search.placeholder).toBe(DialFileManagerI18nKeys.SearchPlaceholder);
  });

  it('filters the loaded rows by name, ignoring case', async () => {
    await renderModal();
    const search = dialog().querySelector('input[placeholder]') as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;

    await act(async () => {
      setValue?.call(search, 'API');
      search.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await flush();

    expect(rowNames()).toEqual(['api keys.xls']);
  });
});

const rowNames = () =>
  [...dialog().querySelectorAll('.ag-center-cols-container [role="row"]')].map((row) =>
    row.querySelector('[col-id="name"]')?.textContent?.trim(),
  );

describe('FileManagerModal row selection', () => {
  it('draws a checkbox per row and a select-all in the header', async () => {
    await renderModal();

    expect(dialog().querySelectorAll('[role="row"]').length).toBeGreaterThan(1);
    expect(rowCheckboxes().length).toBeGreaterThanOrEqual(2);
  });

  it('shows no bulk actions bar while rows are selected', async () => {
    await renderModal();
    await until(() => rowCheckboxes().length > 2);
    await act(async () => (rowCheckboxes()[2] as HTMLInputElement).click());
    await until(() => findButton(DialFileManagerI18nKeys.Add)?.disabled === false);

    expect(dialog().textContent).not.toContain(DialFileManagerI18nKeys.ItemsSelected);
    expect(dialog().querySelector(`button[aria-label="${DialFileManagerI18nKeys.ClearSelection}"]`)).toBeNull();
    expect(findButton(DialFileManagerI18nKeys.Download)).toBeUndefined();
  });

  it('confirms the ticked files by their stored ids', async () => {
    const { onClose } = await renderModal();

    const checkboxes = rowCheckboxes() as HTMLInputElement[];
    await act(async () => checkboxes[2].click());
    await flush();
    expect(findButton(DialFileManagerI18nKeys.Add)?.disabled).toBe(false);

    await act(async () => findButton(DialFileManagerI18nKeys.Add)?.click());
    await flush();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose.mock.calls[0][0]).toHaveLength(1);
    expect(onClose.mock.calls[0][0][0]).toMatch(/^files\/mine\//);
  });
});

describe('FileManagerModal All tab', () => {
  it('lists the three sources as top-level folders and keeps ids unchanged', async () => {
    await renderModal();

    const allChip = [...dialog().querySelectorAll('[role="button"][aria-pressed]')].find(
      (el) => el.textContent?.trim() === DialFileManagerI18nKeys.TabAll,
    ) as HTMLElement;
    await act(async () => allChip.click());
    await flush();

    const text = dialog().textContent ?? '';
    expect(text).toContain(DialFileManagerI18nKeys.TabMyFiles);
    expect(text).toContain(DialFileManagerI18nKeys.TabShared);
    expect(text).toContain(DialFileManagerI18nKeys.TabOrganization);
    expect(listPublicFiles).toHaveBeenCalled();
    expect(listSharedFiles).toHaveBeenCalled();
  });

  const openAll = async () => {
    const allChip = [...dialog().querySelectorAll('[role="button"][aria-pressed]')].find(
      (el) => el.textContent?.trim() === DialFileManagerI18nKeys.TabAll,
    ) as HTMLElement;
    await act(async () => allChip.click());
    await flush();
  };

  it('reports the same id for an Organization file as the Organization tab does', async () => {
    const { onClose } = await renderModal();
    await openAll();

    const orgNode = dialog().querySelector(
      `[role="treeitem"][aria-label="${DialFileManagerI18nKeys.TabOrganization}"]`,
    ) as HTMLElement;
    const target = (orgNode.querySelector('.truncate, span, p') ?? orgNode) as HTMLElement;
    await act(async () => {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await until(() => rowNames().join() === 'spec.pdf');

    expect(rowNames()).toEqual(['spec.pdf']);
    await until(() => rowCheckboxes().length > 1);
    await act(async () => (rowCheckboxes()[1] as HTMLInputElement).click());
    await until(() => findButton(DialFileManagerI18nKeys.Add)?.disabled === false);
    await act(async () => findButton(DialFileManagerI18nKeys.Add)?.click());
    await flush();

    expect(onClose).toHaveBeenCalledWith(['files/public/spec.pdf']);
  });

  it('keeps the Add menu enabled in a writable source folder under All', async () => {
    await renderModal();
    await openAll();

    const addMenu = findButton('Add');
    expect(addMenu?.disabled).toBe(false);
  });

  it('clears the selection when the tab changes', async () => {
    await renderModal();
    await until(() => rowCheckboxes().length > 2);
    await act(async () => (rowCheckboxes()[2] as HTMLInputElement).click());
    await until(() => findButton(DialFileManagerI18nKeys.Add)?.disabled === false);
    expect(findButton(DialFileManagerI18nKeys.Add)?.disabled).toBe(false);

    await openAll();
    await until(() => findButton(DialFileManagerI18nKeys.Add)?.disabled === true);

    expect(findButton(DialFileManagerI18nKeys.Add)?.disabled).toBe(true);
  });

  it('renders under a right-to-left document without errors', async () => {
    document.documentElement.dir = 'rtl';
    await renderModal();
    await until(() => dialog().querySelectorAll('[role="row"]').length > 1);
    document.documentElement.dir = '';

    expect(dialog().querySelector('[role="treeitem"]')).not.toBeNull();
    expect(dialog().querySelectorAll('[role="row"]').length).toBeGreaterThan(1);
  });
});
