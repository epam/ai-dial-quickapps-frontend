import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DialFileManagerTabs,
  DialFileNodeType,
  DialFilePermission,
  type DialFile,
} from '@epam/ai-dial-react-file-manager';

import { FileUploadStatus, type SharedRootMeta } from '@/types/file-manager';
import {
  buildFromCache,
  ensureTrailingSlash,
  fetchFolderListing,
  findFolderByVirtualPath,
  getDownloadFileName,
  getParentApiPath,
  groupBySource,
  hasDialFileWritePermission,
  mapCorePermissions,
  mergeCreatedFolderIntoCache,
  normalizeVirtualPath,
  parseNewFolderVirtualPath,
  resolveOwnerCoords,
  resolveSourceByPath,
  updateUploadEntry,
} from '@/utils/dial-file-manager';
import { listFiles, listPublicFiles, listSharedFiles } from '@/utils/dial-files-api';
import { FilesApiNodeType, type ListFilesItem } from '@/types/dial-files';

vi.mock('@/utils/dial-files-api', () => ({
  listFiles: vi.fn(),
  listPublicFiles: vi.fn(),
  listSharedFiles: vi.fn(),
}));

const folder = (path: string, items: DialFile[] = []): DialFile => ({
  id: path,
  name: path.split('/').filter(Boolean).pop() ?? path,
  path,
  nodeType: DialFileNodeType.FOLDER,
  folderId: 'b',
  items,
});

const file = (name: string, nodeType = DialFileNodeType.ITEM): DialFile => ({
  id: name,
  name,
  path: `/My files/${name}`,
  nodeType,
  folderId: 'b',
});

const sharedRoots = new Map<string, SharedRootMeta>([
  ['Reports', { bucket: 'owner-bucket', dialCorePath: 'files/owner-bucket/team/reports/' }],
]);

describe('mapCorePermissions', () => {
  it('maps known DIAL Core permissions case-insensitively', () => {
    expect(mapCorePermissions(['read', 'WRITE'])).toEqual([
      DialFilePermission.READ,
      DialFilePermission.WRITE,
    ]);
  });

  it.each([undefined, [], ['UNKNOWN']])('returns undefined for %j', (permissions) => {
    expect(mapCorePermissions(permissions)).toBeUndefined();
  });
});

describe('path helpers', () => {
  it('adds a trailing slash only when missing', () => {
    expect(ensureTrailingSlash('a/b')).toBe('a/b/');
    expect(ensureTrailingSlash('a/b/')).toBe('a/b/');
  });

  it.each([
    ['docs/report.pdf', 'docs/'],
    ['docs/nested/', 'docs/'],
    ['report.pdf', ''],
    ['top/', ''],
  ])('returns the parent of %j as %j', (apiPath, parent) => {
    expect(getParentApiPath(apiPath)).toBe(parent);
  });

  it('normalizes trailing slashes in virtual paths', () => {
    expect(normalizeVirtualPath('/My files/docs//')).toBe('/My files/docs');
    expect(normalizeVirtualPath('/')).toBe('/');
  });

  it.each([
    ['/My files/new', { parentVirtualPath: '/My files', name: 'new' }],
    ['/My files/docs/new/', { parentVirtualPath: '/My files/docs', name: 'new' }],
    ['/new', { parentVirtualPath: '/My files', name: 'new' }],
    ['new', { parentVirtualPath: '/My files', name: 'new' }],
  ])('parses new-folder path %j', (virtualPath, expected) => {
    expect(parseNewFolderVirtualPath(virtualPath, 'My files')).toEqual(expected);
  });
});

describe('findFolderByVirtualPath', () => {
  const tree = [folder('/My files/a/', [folder('/My files/a/b/'), file('x.txt')])];

  it('finds a nested folder regardless of trailing slash', () => {
    expect(findFolderByVirtualPath(tree, '/My files/a/b')?.id).toBe('/My files/a/b/');
  });

  it('returns undefined when no folder matches', () => {
    expect(findFolderByVirtualPath(tree, '/My files/x.txt')).toBeUndefined();
  });
});

describe('hasDialFileWritePermission', () => {
  it('is true only for folders with WRITE', () => {
    expect(
      hasDialFileWritePermission({ ...folder('/a/'), permissions: [DialFilePermission.WRITE] }),
    ).toBe(true);
    expect(
      hasDialFileWritePermission({ ...folder('/a/'), permissions: [DialFilePermission.READ] }),
    ).toBe(false);
    expect(hasDialFileWritePermission(undefined)).toBe(false);
  });
});

describe('buildFromCache', () => {
  it('builds a nested tree from flat per-folder listings', () => {
    const cache = new Map<string, ListFilesItem[]>([
      [
        '',
        [
          { name: 'docs', path: 'files/b/docs/', nodeType: FilesApiNodeType.Folder },
          {
            name: 'a%20b.txt',
            path: 'files/b/a%20b.txt',
            nodeType: FilesApiNodeType.Item,
            updatedAt: '2026-01-02T00:00:00Z',
          },
        ],
      ],
      [
        'docs/',
        [{ name: 'inner.txt', path: 'files/b/docs/inner.txt', nodeType: FilesApiNodeType.Item }],
      ],
    ]);
    const permissions = new Map<string, string[] | undefined>([['docs/', ['WRITE']]]);

    const [docs, plain] = buildFromCache(cache, permissions, '', '/My files', 'b');

    expect(docs).toMatchObject({
      name: 'docs',
      path: '/My files/docs/',
      nodeType: DialFileNodeType.FOLDER,
      permissions: [DialFilePermission.WRITE],
    });
    expect(docs.items).toEqual([
      expect.objectContaining({ name: 'inner.txt', path: '/My files/docs/inner.txt' }),
    ]);
    expect(plain).toMatchObject({
      name: 'a b.txt',
      path: '/My files/a b.txt',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('returns no children for a folder that was never listed', () => {
    expect(buildFromCache(new Map(), new Map(), 'missing/', '/My files/missing', 'b')).toEqual([]);
  });
});

describe('mergeCreatedFolderIntoCache', () => {
  const created = { name: 'New', path: 'files/b/New/', folderId: 'b' };

  it('adds the folder to its parent listing without mutating the cache', () => {
    const cache = new Map<string, ListFilesItem[]>([['', []]]);
    const next = mergeCreatedFolderIntoCache(cache, '', created, ['WRITE']);

    expect(next.get('')).toEqual([
      expect.objectContaining({
        name: 'New',
        nodeType: FilesApiNodeType.Folder,
        permissions: ['WRITE'],
      }),
    ]);
    expect(cache.get('')).toEqual([]);
  });

  it('skips a folder whose name is already listed (case-insensitive)', () => {
    const cache = new Map<string, ListFilesItem[]>([
      ['', [{ name: 'new', path: 'files/b/new/', nodeType: FilesApiNodeType.Folder }]],
    ]);
    expect(mergeCreatedFolderIntoCache(cache, '', created).get('')).toHaveLength(1);
  });
});

describe('updateUploadEntry', () => {
  const batch = {
    isOpen: true,
    files: [
      { id: '1', name: 'a', status: FileUploadStatus.Queued },
      { id: '2', name: 'b', status: FileUploadStatus.Queued },
    ],
  };

  it('patches only the given entry', () => {
    const next = updateUploadEntry(batch, 1, { status: FileUploadStatus.Uploading, percent: 40 });
    expect(next?.files[0].status).toBe(FileUploadStatus.Queued);
    expect(next?.files[1]).toMatchObject({ status: FileUploadStatus.Uploading, percent: 40 });
  });

  it('accepts a bare status and ignores a missing batch', () => {
    expect(updateUploadEntry(batch, 0, FileUploadStatus.Failed)?.files[0].status).toBe(
      FileUploadStatus.Failed,
    );
    expect(updateUploadEntry(null, 0, FileUploadStatus.Failed)).toBeNull();
  });
});

describe('resolveOwnerCoords', () => {
  it('maps a path under a shared root to the owner bucket', () => {
    expect(resolveOwnerCoords('Reports/q1/', sharedRoots, 'mine')).toEqual({
      bucket: 'owner-bucket',
      path: 'team/reports/q1/',
    });
    expect(resolveOwnerCoords('Reports', sharedRoots, 'mine')).toEqual({
      bucket: 'owner-bucket',
      path: 'team/reports/',
    });
  });

  it('falls back to the given bucket for the top level or unknown roots', () => {
    expect(resolveOwnerCoords('', sharedRoots, 'mine')).toEqual({ bucket: 'mine', path: '' });
    expect(resolveOwnerCoords('Other/x', sharedRoots, 'mine')).toEqual({
      bucket: 'mine',
      path: 'Other/x',
    });
  });
});

describe('fetchFolderListing', () => {
  const items: ListFilesItem[] = [{ name: 'x', path: 'x', nodeType: FilesApiNodeType.Item }];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(listFiles).mockResolvedValue({ items, permissions: ['READ'] });
    vi.mocked(listPublicFiles).mockResolvedValue({ items });
    vi.mocked(listSharedFiles).mockResolvedValue({ items });
  });

  it('lists the user bucket in My files', async () => {
    await expect(
      fetchFolderListing(DialFileManagerTabs.MyFiles, 'mine', 'docs/', new Map()),
    ).resolves.toEqual({ items, permissions: ['READ'] });
    expect(listFiles).toHaveBeenCalledWith({ bucket: 'mine', path: 'docs/', permissions: true });
  });

  it('lists public files in Organization', async () => {
    await fetchFolderListing(DialFileManagerTabs.Organization, 'mine', '', new Map());
    expect(listPublicFiles).toHaveBeenCalledWith({ path: undefined });
  });

  it('lists the shared roots at the top of Shared', async () => {
    await expect(
      fetchFolderListing(DialFileManagerTabs.Shared, 'mine', '', sharedRoots),
    ).resolves.toEqual({ items });
    expect(listSharedFiles).toHaveBeenCalled();
  });

  it('lists a shared folder in its owner bucket', async () => {
    await fetchFolderListing(DialFileManagerTabs.Shared, 'mine', 'Reports/q1/', sharedRoots);
    expect(listFiles).toHaveBeenCalledWith({
      bucket: 'owner-bucket',
      path: 'team/reports/q1/',
      permissions: true,
    });
  });

  it('returns nothing for an unknown shared root', async () => {
    await expect(
      fetchFolderListing(DialFileManagerTabs.Shared, 'mine', 'Unknown/', sharedRoots),
    ).resolves.toEqual({ items: [] });
    expect(listFiles).not.toHaveBeenCalled();
  });
});

describe('getDownloadFileName', () => {
  it('uses the file name for a single file and a zip otherwise', () => {
    expect(getDownloadFileName([file('a.txt')])).toBe('a.txt');
    expect(getDownloadFileName([file('docs', DialFileNodeType.FOLDER)])).toBe('docs.zip');
    expect(getDownloadFileName([file('a.txt'), file('b.txt')])).toBe('files.zip');
  });
});

describe('resolveSourceByPath', () => {
  const labels = {
    [DialFileManagerTabs.MyFiles]: 'My files',
    [DialFileManagerTabs.Shared]: 'Shared',
    [DialFileManagerTabs.Organization]: 'Organization',
  };

  it('maps each root label to its section', () => {
    expect(resolveSourceByPath('/My files', labels)).toBe(DialFileManagerTabs.MyFiles);
    expect(resolveSourceByPath('/Shared/', labels)).toBe(DialFileManagerTabs.Shared);
    expect(resolveSourceByPath('Organization', labels)).toBe(DialFileManagerTabs.Organization);
  });

  it('resolves nested paths and trailing slashes', () => {
    expect(resolveSourceByPath('/Organization/Design/spec.pdf', labels)).toBe(
      DialFileManagerTabs.Organization,
    );
    expect(resolveSourceByPath('/My files/docs/', labels)).toBe(DialFileManagerTabs.MyFiles);
  });

  it('does not match a label that is only a prefix of the first segment', () => {
    expect(resolveSourceByPath('/Shared with me/a.md', labels)).toBeUndefined();
  });

  it('returns undefined for an unknown path', () => {
    expect(resolveSourceByPath('/Elsewhere/a.md', labels)).toBeUndefined();
    expect(resolveSourceByPath('', labels)).toBeUndefined();
  });

  it('groups mixed items by section and drops unknown ones', () => {
    const items = [
      { path: '/My files/a.md' },
      { path: '/Organization/b.md' },
      { path: '/My files/docs/c.md' },
      { path: '/Elsewhere/d.md' },
    ];

    const groups = groupBySource(items, (item) => item.path, labels);

    expect(groups.get(DialFileManagerTabs.MyFiles)).toEqual([items[0], items[2]]);
    expect(groups.get(DialFileManagerTabs.Organization)).toEqual([items[1]]);
    expect(groups.has(DialFileManagerTabs.Shared)).toBe(false);
  });
});
