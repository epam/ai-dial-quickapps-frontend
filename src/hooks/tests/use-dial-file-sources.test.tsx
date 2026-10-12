import { act, type FC } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  DialFileManagerTabs,
  DialFileNodeType,
  type DialFile,
} from '@epam/ai-dial-react-file-manager';

import { DialFileManagerI18nKeys } from '@/constants/i18n';
import {
  useDialFileManager,
  type UseDialFileManagerOptions,
  type UseDialFileManagerResult,
} from '@/hooks/use-dial-file-manager';
import { useDialFileSources, type UseDialFileSourcesOptions } from '@/hooks/use-dial-file-sources';

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/hooks/use-dial-file-manager', () => ({ useDialFileManager: vi.fn() }));

const LABELS = {
  [DialFileManagerTabs.MyFiles]: 'My files',
  [DialFileManagerTabs.Shared]: 'Shared',
  [DialFileManagerTabs.Organization]: 'Organization',
} as const;

const rootFolder = (label: string): DialFile => ({
  id: label,
  name: label,
  path: `/${label}`,
  nodeType: DialFileNodeType.FOLDER,
  folderId: label,
  items: [],
});

const createFake = (label: string, overrides: Partial<UseDialFileManagerResult> = {}) =>
  ({
    items: [rootFolder(label)],
    isLoading: false,
    error: null,
    path: `/${label}`,
    onPathChange: vi.fn(),
    retry: vi.fn(),
    onUploadFiles: vi.fn(),
    onValidateUpload: vi.fn().mockResolvedValue({ valid: true }),
    uploadBatchState: null,
    cancelUpload: vi.fn(),
    cancelUploadItem: vi.fn(),
    clearUploadBatch: vi.fn(),
    onCreateFolder: vi.fn().mockResolvedValue(undefined),
    onCreateFolderValidate: vi.fn().mockReturnValue(null),
    isCreatingFolder: false,
    onDownloadFiles: vi.fn(),
    isDownloading: false,
    onDeleteFiles: vi.fn(),
    isDeleting: false,
    onRenameValidate: vi.fn().mockReturnValue(null),
    onMoveToFiles: vi.fn(),
    isRenaming: false,
    isUploadEnabled: true,
    isNewButtonDisabled: false,
    disabledNewButtonTooltip: 'no permission',
    visibleColumns: [],
    dateLocale: 'en',
    dateOptions: {},
    actionLabels: {},
    sharedWithMeIds: undefined,
    ...overrides,
  }) as unknown as UseDialFileManagerResult;

let fakes: Record<string, UseDialFileManagerResult>;
let enabled: Record<string, boolean>;
let latest: UseDialFileManagerResult;
let onNotification: Mock<NonNullable<UseDialFileSourcesOptions['onNotification']>>;

const Probe: FC<UseDialFileSourcesOptions> = (props) => {
  latest = useDialFileSources(props);
  return null;
};

let root: Root;
let container: HTMLDivElement;

const render = async (activeTab: DialFileManagerTabs) => {
  await act(async () =>
    root.render(
      <Probe bucket="mine" activeTab={activeTab} labels={LABELS} onNotification={onNotification} />,
    ),
  );
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  fakes = {
    [DialFileManagerTabs.MyFiles]: createFake('My files'),
    [DialFileManagerTabs.Shared]: createFake('Shared', { isUploadEnabled: false }),
    [DialFileManagerTabs.Organization]: createFake('Organization', { isUploadEnabled: false }),
  };
  enabled = {};
  onNotification = vi.fn<NonNullable<UseDialFileSourcesOptions['onNotification']>>();
  vi.mocked(useDialFileManager).mockImplementation((options: UseDialFileManagerOptions) => {
    enabled[options.activeTab ?? ''] = options.isEnabled ?? true;
    return fakes[options.activeTab ?? ''];
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const my = () => fakes[DialFileManagerTabs.MyFiles];
const shared = () => fakes[DialFileManagerTabs.Shared];
const org = () => fakes[DialFileManagerTabs.Organization];

describe('useDialFileSources — single tabs', () => {
  it('returns the loader of the active tab and enables only that source', async () => {
    await render(DialFileManagerTabs.Organization);

    expect(latest.items).toBe(org().items);
    expect(enabled[DialFileManagerTabs.Organization]).toBe(true);
    expect(enabled[DialFileManagerTabs.Shared]).toBe(false);
  });

  it('keeps a source enabled once it has been shown', async () => {
    await render(DialFileManagerTabs.Shared);
    await render(DialFileManagerTabs.MyFiles);

    expect(enabled[DialFileManagerTabs.Shared]).toBe(true);
    expect(latest.items).toBe(my().items);
  });
});

describe('useDialFileSources — All view', () => {
  it('enables every source and lists the three roots side by side', async () => {
    await render(DialFileManagerTabs.All);

    expect(Object.values(enabled)).toEqual([true, true, true]);
    expect(latest.items.map((item) => item.path)).toEqual([
      '/My files',
      '/Shared',
      '/Organization',
    ]);
  });

  it('reports loading while any source loads and an error only when all fail', async () => {
    fakes[DialFileManagerTabs.Shared] = createFake('Shared', {
      isLoading: true,
      error: DialFileManagerI18nKeys.Error,
    });
    await render(DialFileManagerTabs.All);

    expect(latest.isLoading).toBe(true);
    expect(latest.error).toBeNull();
  });

  it('opens a folder in the source that owns it and follows its path', async () => {
    await render(DialFileManagerTabs.All);

    await act(async () => latest.onPathChange('/Organization/Design/'));

    expect(org().onPathChange).toHaveBeenCalledWith('/Organization/Design/');
    expect(my().onPathChange).not.toHaveBeenCalled();
    expect(latest.path).toBe('/Organization/Design/');
  });

  it('routes upload, validation and folder creation by destination folder', async () => {
    await render(DialFileManagerTabs.All);
    const files = [{ name: 'a.pdf', fileContent: new File([], 'a.pdf') }];

    latest.onUploadFiles(files, '/My files/docs');
    await latest.onValidateUpload(files, [], '/Shared/team');
    await latest.onCreateFolder(files[0], '/My files/docs/new', 'id');

    expect(my().onUploadFiles).toHaveBeenCalledWith(files, '/My files/docs');
    expect(shared().onValidateUpload).toHaveBeenCalledWith(files, [], '/Shared/team');
    expect(my().onCreateFolder).toHaveBeenCalledWith(files[0], '/My files/docs/new', 'id');
    expect(shared().onUploadFiles).not.toHaveBeenCalled();
  });

  it('validates names with the source that owns the folder or item', async () => {
    await render(DialFileManagerTabs.All);
    const sharedFolder = { ...rootFolder('Shared'), path: '/Shared/team/' };
    const orgFile = { ...rootFolder('Organization'), path: '/Organization/a.md' };

    latest.onCreateFolderValidate('x', sharedFolder);
    latest.onRenameValidate('y', orgFile);

    expect(shared().onCreateFolderValidate).toHaveBeenCalledWith('x', sharedFolder);
    expect(org().onRenameValidate).toHaveBeenCalledWith('y', orgFile);
    expect(my().onCreateFolderValidate).not.toHaveBeenCalled();
  });

  it('handles a mixed selection one source at a time for download and delete', async () => {
    await render(DialFileManagerTabs.All);
    const mine = { ...rootFolder('My files'), path: '/My files/a.md' };
    const theirs = { ...rootFolder('Organization'), path: '/Organization/b.md' };
    const deletes = [
      { sourceUrl: '/My files/a.md', nodeType: DialFileNodeType.ITEM },
      { sourceUrl: '/Organization/b.md', nodeType: DialFileNodeType.ITEM },
    ];

    latest.onDownloadFiles([mine, theirs]);
    latest.onDeleteFiles(deletes, '/My files');

    expect(my().onDownloadFiles).toHaveBeenCalledWith([mine]);
    expect(org().onDownloadFiles).toHaveBeenCalledWith([theirs]);
    expect(my().onDeleteFiles).toHaveBeenCalledWith([deletes[0]], '/My files');
    expect(org().onDeleteFiles).toHaveBeenCalledWith([deletes[1]], '/My files');
  });

  it('moves within one source and refuses a move across sources', async () => {
    await render(DialFileManagerTabs.All);
    const within = [
      {
        sourceUrl: '/My files/a.md',
        destinationUrl: '/My files/docs/a.md',
        nodeType: DialFileNodeType.ITEM,
      },
    ];
    const across = [
      {
        sourceUrl: '/My files/a.md',
        destinationUrl: '/Organization/a.md',
        nodeType: DialFileNodeType.ITEM,
      },
    ];

    latest.onMoveToFiles(within, '/My files', '/My files/docs');
    expect(my().onMoveToFiles).toHaveBeenCalledWith(within, '/My files', '/My files/docs');
    expect(onNotification).not.toHaveBeenCalled();

    latest.onMoveToFiles(across, '/My files', '/Organization');
    expect(org().onMoveToFiles).not.toHaveBeenCalled();
    expect(my().onMoveToFiles).toHaveBeenCalledTimes(1);
    expect(onNotification).toHaveBeenCalledWith(
      expect.objectContaining({ message: DialFileManagerI18nKeys.CrossSourceMoveNotAllowed }),
    );
  });

  it('takes permissions from the source of the current folder', async () => {
    await render(DialFileManagerTabs.All);
    expect(latest.isUploadEnabled).toBe(true);

    await act(async () => latest.onPathChange('/Shared/team/'));

    expect(latest.isUploadEnabled).toBe(false);
  });

  it('disables the Add menu with a hint when no source folder is open', async () => {
    await render(DialFileManagerTabs.All);

    await act(async () => latest.onPathChange(undefined));

    expect(latest.isNewButtonDisabled).toBe(true);
    expect(latest.isUploadEnabled).toBe(false);
    expect(latest.disabledNewButtonTooltip).toBe(DialFileManagerI18nKeys.AddDisabledAtAllRoot);
  });

  it('reports busy state and the running upload of any source', async () => {
    const batch = { files: [] };
    fakes[DialFileManagerTabs.Shared] = createFake('Shared', {
      isDeleting: true,
      uploadBatchState: batch as never,
    });
    await render(DialFileManagerTabs.All);

    expect(latest.isDeleting).toBe(true);
    expect(latest.isRenaming).toBe(false);
    expect(latest.uploadBatchState).toBe(batch);
  });

  it('retries and cancels uploads and single files on every source', async () => {
    await render(DialFileManagerTabs.All);

    latest.retry();
    latest.cancelUpload();
    latest.cancelUploadItem('42');

    for (const fake of [my(), shared(), org()]) {
      expect(fake.retry).toHaveBeenCalledTimes(1);
      expect(fake.cancelUpload).toHaveBeenCalledTimes(1);
      expect(fake.cancelUploadItem).toHaveBeenCalledWith('42');
    }
  });
});

describe('useDialFileSources — upload queue', () => {
  it('shows another source upload in a single-source view', async () => {
    const batch = { files: [] };
    fakes[DialFileManagerTabs.Shared] = createFake('Shared', { uploadBatchState: batch as never });
    await render(DialFileManagerTabs.MyFiles);

    expect(latest.uploadBatchState).toBe(batch);

    latest.clearUploadBatch();
    for (const fake of [my(), shared(), org()]) {
      expect(fake.clearUploadBatch).toHaveBeenCalledTimes(1);
    }
  });

  it('clears the other sources batches when an upload starts', async () => {
    await render(DialFileManagerTabs.MyFiles);
    const files = [{ name: 'a.pdf', fileContent: new File(['x'], 'a.pdf') }];

    latest.onUploadFiles(files, '/My files/docs/');

    expect(my().onUploadFiles).toHaveBeenCalledWith(files, '/My files/docs/');
    expect(my().clearUploadBatch).not.toHaveBeenCalled();
    expect(shared().clearUploadBatch).toHaveBeenCalledTimes(1);
    expect(org().clearUploadBatch).toHaveBeenCalledTimes(1);
  });
});
