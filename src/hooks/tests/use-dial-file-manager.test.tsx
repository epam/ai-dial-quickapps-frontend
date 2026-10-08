import { act, type FC } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationVariant } from '@epam/ai-dial-ui-kit';
import {
  DialFileManagerActions,
  DialFileManagerTabs,
  DialFileNodeType,
  FileManagerColumnKey,
  type DialFile,
} from '@epam/ai-dial-react-file-manager';

import { DialFileManagerI18nKeys } from '@/constants/i18n';
import { FileUploadStatus } from '@/types/file-manager';
import {
  useDialFileManager,
  type UseDialFileManagerOptions,
  type UseDialFileManagerResult,
} from '@/hooks/use-dial-file-manager';
import {
  createFolder,
  deleteFiles,
  listFiles,
  listSharedFiles,
  uploadFile,
} from '@/utils/dial-files-api';
import { FilesApiNodeType, type ListFilesItem } from '@/types/dial-files';

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
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
vi.mock('@/utils/file-download', () => ({
  DownloadDestinationType: { Cancelled: 'cancelled' },
  prepareDownloadDestination: vi.fn(),
  triggerBrowserDownload: vi.fn(),
}));

const ROOT_ITEMS: ListFilesItem[] = [
  { name: 'docs', path: 'files/mine/docs/', nodeType: FilesApiNodeType.Folder, bucket: 'mine' },
  {
    name: 'notes.txt',
    path: 'files/mine/notes.txt',
    nodeType: FilesApiNodeType.Item,
    bucket: 'mine',
  },
];

let latest: UseDialFileManagerResult;

const Probe: FC<UseDialFileManagerOptions> = (props) => {
  latest = useDialFileManager(props);
  return null;
};

let root: Root;
let container: HTMLDivElement;

const render = async (props: Partial<UseDialFileManagerOptions> = {}) => {
  await act(async () => root.render(<Probe bucket="mine" {...props} />));
};

const rootFolder = (): DialFile => latest.items[0];

beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  vi.mocked(listFiles).mockResolvedValue({ items: ROOT_ITEMS, permissions: ['READ', 'WRITE'] });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useDialFileManager — listing', () => {
  it('loads the bucket root into a tree under the root label', async () => {
    await render();

    expect(listFiles).toHaveBeenCalledWith({ bucket: 'mine', path: '', permissions: true });
    expect(latest.isLoading).toBe(false);
    expect(latest.path).toBe('/My files');
    expect(rootFolder().items?.map((item) => item.path)).toEqual([
      '/My files/docs/',
      '/My files/notes.txt',
    ]);
  });

  it('does not request My files before the bucket is known', async () => {
    await render({ bucket: '' });

    expect(listFiles).not.toHaveBeenCalled();
    expect(latest.isLoading).toBe(true);
  });

  it('defers the first listing while disabled and lists once when enabled', async () => {
    await render({ isEnabled: false });

    expect(listFiles).not.toHaveBeenCalled();
    expect(latest.isLoading).toBe(false);

    await render({ isEnabled: true });

    expect(listFiles).toHaveBeenCalledTimes(1);
    expect(listFiles).toHaveBeenCalledWith({ bucket: 'mine', path: '', permissions: true });
    expect(rootFolder().items?.map((item) => item.path)).toEqual([
      '/My files/docs/',
      '/My files/notes.txt',
    ]);
  });

  it('enables upload, rename and delete in a writable My files folder', async () => {
    await render();

    expect(latest.uploadEnabled).toBe(true);
    expect(latest.isNewButtonDisabled).toBe(false);
    expect(latest.visibleColumns).not.toContain(FileManagerColumnKey.Author);
    expect(Object.keys(latest.actionLabels)).toEqual(
      expect.arrayContaining([
        DialFileManagerActions.Download,
        DialFileManagerActions.Delete,
        DialFileManagerActions.Rename,
      ]),
    );
  });

  it('disables upload without WRITE permission', async () => {
    vi.mocked(listFiles).mockResolvedValue({ items: ROOT_ITEMS, permissions: ['READ'] });
    await render();

    expect(latest.uploadEnabled).toBe(false);
    expect(latest.actionLabels[DialFileManagerActions.Rename]).toBeUndefined();
  });

  it('reports a listing error and loads again on retry', async () => {
    vi.mocked(listFiles).mockRejectedValueOnce(new Error('offline'));
    await render();
    expect(latest.error).toBe(DialFileManagerI18nKeys.Error);

    await act(async () => latest.retry());

    expect(latest.error).toBeNull();
    expect(listFiles).toHaveBeenCalledTimes(2);
  });

  it('opens a subfolder by its virtual path', async () => {
    await render();
    vi.mocked(listFiles).mockResolvedValueOnce({
      items: [{ name: 'a.md', path: 'files/mine/docs/a.md', nodeType: FilesApiNodeType.Item }],
    });

    await act(async () => latest.onPathChange('/My files/docs'));

    expect(listFiles).toHaveBeenLastCalledWith({
      bucket: 'mine',
      path: 'docs/',
      permissions: true,
    });
    expect(latest.path).toBe('/My files/docs/');
    expect(rootFolder().items?.[0].items?.map((item) => item.name)).toEqual(['a.md']);

    await act(async () => latest.onPathChange(undefined));
    expect(latest.path).toBe('/My files');
  });

  it('shows the author column and shared roots in the Shared tab, read-only at the top', async () => {
    vi.mocked(listSharedFiles).mockResolvedValue({
      items: [
        {
          name: 'Reports',
          path: 'files/owner/reports/',
          nodeType: FilesApiNodeType.Folder,
          bucket: 'owner',
        },
      ],
    });
    await render({ activeTab: DialFileManagerTabs.Shared });

    expect(listSharedFiles).toHaveBeenCalled();
    expect(latest.visibleColumns).toContain(FileManagerColumnKey.Author);
    expect(latest.sharedWithMeIds).toEqual(['files/owner/reports/']);
    expect(latest.uploadEnabled).toBe(false);
  });
});

describe('useDialFileManager — validation', () => {
  it.each([
    ['', DialFileManagerI18nKeys.FolderNameEmpty],
    ['a/b', DialFileManagerI18nKeys.FolderNameInvalidChars],
    ['.hidden', DialFileManagerI18nKeys.FolderNameHidden],
    ['x'.repeat(256), DialFileManagerI18nKeys.FolderNameTooLong],
    ['DOCS', DialFileManagerI18nKeys.FolderConflict],
    ['fresh', null],
  ])('validates new folder name %j', async (name, expected) => {
    await render();
    expect(latest.onCreateFolderValidate(name, rootFolder())).toBe(expected);
  });

  it('validates renames against forbidden symbols and siblings', async () => {
    await render({ forbiddenSymbolsRegExp: /[*]/ });
    const notes = rootFolder().items?.find((item) => item.name === 'notes.txt') as DialFile;

    expect(latest.onRenameValidate('a*b', notes)).toBe(DialFileManagerI18nKeys.RenameInvalidChars);
    expect(latest.onRenameValidate('Docs', notes)).toBe(
      DialFileManagerI18nKeys.RenameDuplicateName,
    );
    expect(latest.onRenameValidate('notes.txt', notes)).toBeNull();
  });

  it('sanitizes upload file names in place', async () => {
    await render();
    const files = [{ name: 'a/b.txt' }] as Parameters<typeof latest.onValidateUpload>[0];

    await expect(latest.onValidateUpload(files, [], '/My files')).resolves.toEqual({ valid: true });
    expect(files[0].name).not.toContain('/');
  });
});

describe('useDialFileManager — mutations', () => {
  it('creates a folder in the current bucket and adds it to the tree', async () => {
    vi.mocked(createFolder).mockResolvedValue({
      name: 'fresh',
      path: 'files/mine/fresh/',
      folderId: 'mine',
    } as Awaited<ReturnType<typeof createFolder>>);
    await render();

    await act(async () =>
      latest.onCreateFolder(
        {} as Parameters<typeof latest.onCreateFolder>[0],
        '/My files/fresh',
        '',
      ),
    );

    expect(createFolder).toHaveBeenCalledWith({
      bucket: 'mine',
      parentPath: undefined,
      name: 'fresh',
    });
    expect(latest.isCreatingFolder).toBe(false);
  });

  it('notifies when creating a folder fails', async () => {
    vi.mocked(createFolder).mockRejectedValue(new Error('nope'));
    const onNotification = vi.fn();
    await render({ onNotification });

    await act(async () =>
      latest.onCreateFolder(
        {} as Parameters<typeof latest.onCreateFolder>[0],
        '/My files/fresh',
        '',
      ),
    );

    expect(onNotification).toHaveBeenCalledWith({
      variant: NotificationVariant.Error,
      message: DialFileManagerI18nKeys.FolderCreateError,
    });
  });

  it('deletes items, notifies, and returns to the parent when the open folder is deleted', async () => {
    vi.mocked(deleteFiles).mockResolvedValue({
      results: [{ path: 'docs/', success: true }],
    } as Awaited<ReturnType<typeof deleteFiles>>);
    const onNotification = vi.fn();
    await render({ onNotification });
    await act(async () => latest.onPathChange('/My files/docs'));

    await act(async () =>
      latest.onDeleteFiles(
        [{ sourceUrl: '/My files/docs/', nodeType: DialFileNodeType.FOLDER }] as Parameters<
          typeof latest.onDeleteFiles
        >[0],
        '',
      ),
    );

    expect(deleteFiles).toHaveBeenCalledWith([
      { bucket: 'mine', path: 'docs/', name: 'docs', nodeType: FilesApiNodeType.Folder },
    ]);
    expect(onNotification).toHaveBeenCalledWith(
      expect.objectContaining({ variant: NotificationVariant.Success }),
    );
    expect(latest.path).toBe('/My files');
    expect(latest.isDeleting).toBe(false);
  });
});

describe('useDialFileManager — uploads', () => {
  interface PendingUpload {
    path: string;
    signal?: AbortSignal;
    onProgress?: (percent: number) => void;
    resolve: () => void;
    reject: () => void;
  }

  let pending: PendingUpload[];

  const fileItem = (name: string) => ({ name, fileContent: new File(['x'], name) });

  const statuses = () => latest.uploadBatchState?.files.map((entry) => entry.status);

  const settle = async (name: string, outcome: 'resolve' | 'reject') => {
    await act(async () => {
      pending.find((upload) => upload.path.endsWith(name))?.[outcome]();
    });
  };

  beforeEach(() => {
    pending = [];
    vi.mocked(uploadFile).mockImplementation(
      (_bucket, path, _file, options) =>
        new Promise((resolve, reject) => {
          const upload: PendingUpload = {
            path,
            signal: options?.signal,
            onProgress: options?.onProgress,
            resolve: () => resolve({} as never),
            reject: () => reject(new Error('failed')),
          };
          options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          pending.push(upload);
        }),
    );
  });

  it('tracks each file to completion and keeps the batch after it ends', async () => {
    const onNotification = vi.fn();
    await render({ onNotification });

    await act(async () =>
      latest.onUploadFiles([fileItem('a.pdf'), fileItem('b.pdf')], '/My files/'),
    );
    expect(statuses()).toEqual([FileUploadStatus.Uploading, FileUploadStatus.Uploading]);

    await act(async () => pending[0].onProgress?.(40));
    expect(latest.uploadBatchState?.files[0].percent).toBe(40);

    await settle('a.pdf', 'resolve');
    await settle('b.pdf', 'resolve');

    expect(statuses()).toEqual([FileUploadStatus.Completed, FileUploadStatus.Completed]);
    expect(onNotification).toHaveBeenCalledWith(
      expect.objectContaining({ variant: NotificationVariant.Success }),
    );

    act(() => latest.clearUploadBatch());
    expect(latest.uploadBatchState).toBeNull();
  });

  it('marks a failed file without stopping the others', async () => {
    await render();

    await act(async () =>
      latest.onUploadFiles([fileItem('a.pdf'), fileItem('b.pdf')], '/My files/'),
    );
    await settle('a.pdf', 'reject');
    await settle('b.pdf', 'resolve');

    expect(statuses()).toEqual([FileUploadStatus.Failed, FileUploadStatus.Completed]);
  });

  it('cancels one file and lets the rest finish', async () => {
    const onNotification = vi.fn();
    await render({ onNotification });

    await act(async () =>
      latest.onUploadFiles([fileItem('a.pdf'), fileItem('b.pdf')], '/My files/'),
    );
    const [, second] = latest.uploadBatchState?.files ?? [];
    await act(async () => latest.cancelUploadItem(second.id));
    await settle('a.pdf', 'resolve');

    expect(pending[0].signal?.aborted).toBe(false);
    expect(statuses()).toEqual([FileUploadStatus.Completed, FileUploadStatus.Cancelled]);
    expect(onNotification).toHaveBeenCalled();
  });

  it('skips a queued file that is cancelled before it starts', async () => {
    await render();

    const names = ['a.pdf', 'b.pdf', 'c.pdf', 'd.pdf'];
    await act(async () => latest.onUploadFiles(names.map(fileItem), '/My files/'));
    const queued = latest.uploadBatchState?.files[3];
    expect(queued?.status).toBe(FileUploadStatus.Queued);

    await act(async () => latest.cancelUploadItem(queued?.id ?? ''));
    for (const name of names.slice(0, 3)) await settle(name, 'resolve');

    expect(uploadFile).toHaveBeenCalledTimes(3);
    expect(statuses()?.[3]).toBe(FileUploadStatus.Cancelled);
  });

  it('cancels the whole batch without a notification', async () => {
    const onNotification = vi.fn();
    await render({ onNotification });

    await act(async () =>
      latest.onUploadFiles([fileItem('a.pdf'), fileItem('b.pdf')], '/My files/'),
    );
    await act(async () => latest.cancelUpload());

    expect(statuses()).toEqual([FileUploadStatus.Cancelled, FileUploadStatus.Cancelled]);
    expect(onNotification).not.toHaveBeenCalled();
  });
});
