import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DeleteItemDtoNodeTypeEnum,
  RenameItemDtoNodeTypeEnum,
} from '@epam/ai-dial-chat-api-client';

import { FilesApiNodeType } from '@/types/dial-files';
import { filesApi } from '@/utils/chat-api-client';
import { chatApiFetch } from '@/utils/chat-api-fetch';
import {
  createFolder,
  deleteFiles,
  downloadArchive,
  downloadFile,
  listFiles,
  listPublicFiles,
  listSharedFiles,
  renameFiles,
  uploadFile,
} from '@/utils/dial-files-api';
import {
  handleUnauthorized401,
  handleUnauthorizedResponse,
} from '@/utils/handle-unauthorized-response';

vi.mock('@/utils/chat-api-client', () => ({
  filesApi: {
    listFiles: vi.fn(),
    listPublicFiles: vi.fn(),
    listSharedFiles: vi.fn(),
    createFolder: vi.fn(),
    deleteFiles: vi.fn(),
    renameFiles: vi.fn(),
  },
}));
vi.mock('@/utils/chat-api-fetch', () => ({
  chatApiFetch: vi.fn(),
  getCsrfToken: () => 'csrf-1',
}));
vi.mock('@/utils/handle-unauthorized-response', () => ({
  handleUnauthorized401: vi.fn(),
  handleUnauthorizedResponse: vi.fn(),
}));

type FilesApiMock = { [K in keyof typeof filesApi]: ReturnType<typeof vi.fn> };
const api = filesApi as unknown as FilesApiMock;

const dtoItem = {
  name: 'docs',
  path: 'docs/',
  url: 'files/b/docs/',
  nodeType: 'folder',
  bucket: 'b',
  updatedAt: Date.UTC(2026, 0, 2),
  permissions: ['READ'],
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('listing', () => {
  it('normalizes chat-api items to this app shape', async () => {
    api.listFiles.mockResolvedValue({ items: [dtoItem], permissions: ['WRITE'] });

    const res = await listFiles({ bucket: 'b', path: 'docs/', permissions: true });

    expect(api.listFiles).toHaveBeenCalledWith({
      bucket: 'b',
      path: 'docs/',
      permissions: true,
      recursive: undefined,
      limit: 1000,
    });
    expect(res.permissions).toEqual(['WRITE']);
    expect(res.items[0]).toMatchObject({
      name: 'docs',
      nodeType: FilesApiNodeType.Folder,
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('returns nothing without a bucket', async () => {
    await expect(listFiles({ bucket: '' })).resolves.toEqual({ items: [] });
    expect(api.listFiles).not.toHaveBeenCalled();
  });

  it('lists public and shared files', async () => {
    api.listPublicFiles.mockResolvedValue({ items: [{ ...dtoItem, nodeType: 'item' }] });
    api.listSharedFiles.mockResolvedValue({ items: [] });

    const publicFiles = await listPublicFiles({ path: 'x/' });
    await listSharedFiles();

    expect(api.listPublicFiles).toHaveBeenCalledWith({ path: 'x/', limit: 1000 });
    expect(publicFiles.items[0].nodeType).toBe(FilesApiNodeType.Item);
    expect(api.listSharedFiles).toHaveBeenCalled();
  });
});

describe('mutations', () => {
  it('creates a folder', async () => {
    api.createFolder.mockResolvedValue({ name: 'n', path: 'p', folderId: 'f' });

    await createFolder({ bucket: 'b', name: 'n' });

    expect(api.createFolder).toHaveBeenCalledWith({ createFolderDto: { bucket: 'b', name: 'n' } });
  });

  it('maps node types to chat-api enums when deleting', async () => {
    api.deleteFiles.mockResolvedValue({ results: [{ path: 'a', success: true, extra: 1 }] });

    const res = await deleteFiles([
      { bucket: 'b', path: 'a', name: 'a', nodeType: FilesApiNodeType.Item },
      { bucket: 'b', path: 'd/', name: 'd', nodeType: FilesApiNodeType.Folder },
    ]);

    expect(
      api.deleteFiles.mock.calls[0][0].deleteFilesDto.items.map(
        (i: { nodeType: string }) => i.nodeType,
      ),
    ).toEqual([DeleteItemDtoNodeTypeEnum.Item, DeleteItemDtoNodeTypeEnum.Folder]);
    expect(res).toEqual({ results: [{ path: 'a', success: true }] });
  });

  it('maps node types to chat-api enums when renaming', async () => {
    api.renameFiles.mockResolvedValue({ results: [{ sourcePath: 'd/', success: false }] });

    const res = await renameFiles([
      {
        bucket: 'b',
        sourcePath: 'd/',
        destinationPath: 'e/',
        name: 'd',
        nodeType: FilesApiNodeType.Folder,
      },
    ]);

    expect(api.renameFiles.mock.calls[0][0].renameFilesDto.items[0].nodeType).toBe(
      RenameItemDtoNodeTypeEnum.Folder,
    );
    expect(res).toEqual({ results: [{ sourcePath: 'd/', success: false }] });
  });
});

describe('downloads', () => {
  it('downloads a single file through chat-api', async () => {
    const ok = new Response('data', { status: 200 });
    vi.mocked(chatApiFetch).mockResolvedValue(ok);

    await expect(downloadFile('b', 'a b.txt')).resolves.toBe(ok);
    expect(chatApiFetch).toHaveBeenCalledWith('/api/v1/files/download?bucket=b&path=a+b.txt');
  });

  it('reports an expired session on 401', async () => {
    vi.mocked(chatApiFetch).mockResolvedValue(new Response(null, { status: 401 }));
    vi.mocked(handleUnauthorizedResponse).mockReturnValue(true);

    await expect(downloadFile('b', 'a')).rejects.toThrow('Download failed: 401: session expired');
  });

  it('downloads a one-file archive as a plain file and rejects real archives', async () => {
    vi.mocked(chatApiFetch).mockResolvedValue(new Response('x', { status: 200 }));
    const item = { bucket: 'b', path: 'a', name: 'a', nodeType: FilesApiNodeType.Item };

    await downloadArchive([item]);
    expect(chatApiFetch).toHaveBeenCalledTimes(1);

    await expect(downloadArchive([item, item])).rejects.toThrow('not supported');
  });
});

describe('uploadFile', () => {
  const file = new File(['x'], 'a.txt');

  it('posts multipart data in create-only mode by default', async () => {
    vi.mocked(chatApiFetch).mockResolvedValue(new Response(null, { status: 200 }));

    const res = await uploadFile('b', 'docs/a.txt', file);

    const [url, init] = vi.mocked(chatApiFetch).mock.calls[0];
    const body = init?.body as FormData;
    expect(url).toBe('/api/v1/files');
    expect(body.get('bucket')).toBe('b');
    expect(body.get('path')).toBe('docs/a.txt');
    expect(body.get('uploadMode')).toBe('create-only');
    expect(res).toEqual({ name: 'a.txt', path: 'files/b/docs/a.txt', bucket: 'b' });
  });

  it('fails with a session-expired error on 401', async () => {
    vi.mocked(chatApiFetch).mockResolvedValue(new Response(null, { status: 401 }));
    vi.mocked(handleUnauthorizedResponse).mockReturnValue(true);

    await expect(uploadFile('b', 'a.txt', file)).rejects.toThrow('session expired');
  });

  describe('with progress', () => {
    class FakeXhr {
      static last: FakeXhr;
      status = 0;
      withCredentials = false;
      headers: Record<string, string> = {};
      listeners: Record<string, () => void> = {};
      upload = {
        listeners: {} as Record<string, (e: Partial<ProgressEvent>) => void>,
        addEventListener(type: string, cb: (e: Partial<ProgressEvent>) => void) {
          this.listeners[type] = cb;
        },
      };
      constructor() {
        FakeXhr.last = this;
      }
      open = vi.fn();
      send = vi.fn();
      abort = vi.fn();
      setRequestHeader(name: string, value: string) {
        this.headers[name] = value;
      }
      addEventListener(type: string, cb: () => void) {
        this.listeners[type] = cb;
      }
    }

    beforeEach(() => {
      vi.stubGlobal('XMLHttpRequest', FakeXhr);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('reports progress and resolves on success', async () => {
      const onProgress = vi.fn();
      const promise = uploadFile('b', 'a.txt', file, { onProgress, uploadMode: 'overwrite' });
      const xhr = FakeXhr.last;

      xhr.upload.listeners.progress({ lengthComputable: true, loaded: 1, total: 4 });
      xhr.status = 201;
      xhr.listeners.load();

      await expect(promise).resolves.toEqual({ name: 'a.txt', path: 'files/b/a.txt', bucket: 'b' });
      expect(onProgress).toHaveBeenCalledWith(25);
      expect(xhr.withCredentials).toBe(true);
      expect(xhr.headers['X-CSRF-Token']).toBe('csrf-1');
    });

    it('handles 401 and rejects', async () => {
      const promise = uploadFile('b', 'a.txt', file, { onProgress: vi.fn() });
      const xhr = FakeXhr.last;
      xhr.status = 401;
      xhr.listeners.load();

      await expect(promise).rejects.toThrow('Upload failed: 401');
      expect(handleUnauthorized401).toHaveBeenCalled();
    });

    it('aborts the request when the signal fires', async () => {
      const controller = new AbortController();
      const promise = uploadFile('b', 'a.txt', file, {
        onProgress: vi.fn(),
        signal: controller.signal,
      });
      const xhr = FakeXhr.last;

      controller.abort();
      xhr.listeners.abort();

      expect(xhr.abort).toHaveBeenCalled();
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    });
  });
});
