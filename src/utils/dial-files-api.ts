import { handleUnauthorizedResponse } from '@/utils/handle-unauthorized-response';

export interface ListFilesItem {
  name: string;
  path: string;
  url?: string;
  nodeType: 'ITEM' | 'FOLDER';
  bucket?: string;
  folderId?: string;
  parentPath?: string;
  contentType?: string;
  contentLength?: number;
  updatedAt?: string;
  author?: string;
  resourceType?: string;
  permissions?: string[];
}

export interface ListFilesResponse {
  items: ListFilesItem[];
  permissions?: string[];
}

export interface CreateFolderResponse {
  name: string;
  path: string;
  folderId: string;
  bucket?: string;
  parentPath?: string;
}

export interface DeleteItemDto {
  bucket: string;
  path: string;
  name: string;
  nodeType: 'ITEM' | 'FOLDER';
}

export interface DeleteFilesResponse {
  results: Array<{ path: string; success: boolean }>;
}

export interface RenameItemDto {
  bucket: string;
  sourcePath: string;
  destinationPath: string;
  nodeType: 'ITEM' | 'FOLDER';
  name: string;
}

export interface RenameFilesResponse {
  results: Array<{ sourcePath: string; success: boolean }>;
}

export interface ArchiveItemDto {
  bucket: string;
  path: string;
  name: string;
  nodeType: 'ITEM' | 'FOLDER';
}

export interface FileUploadResponse {
  name: string;
  path: string;
  bucket: string;
}

// DIAL Core raw item shape from /v1/metadata/files/...
interface CoreMetadataItem {
  name?: string;
  url?: string;
  nodeType?: string;
  parentPath?: string;
  contentType?: string;
  contentLength?: number;
  updatedAt?: number;
  permissions?: string[];
  author?: string;
  owner?: string;
  bucket?: string;
}

const PROXY = '/api/dial';

async function dialGet<T>(path: string): Promise<T> {
  const res = await fetch(`${PROXY}${path}`);
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`DIAL ${res.status} ${path}: session expired`);
    }
    throw new Error(`DIAL ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

async function dialPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PROXY}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`DIAL ${res.status} ${path}: session expired`);
    }
    throw new Error(`DIAL ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}

function normalizeCoreItem(
  item: CoreMetadataItem,
  bucket: string,
  apiFolder: string,
): ListFilesItem {
  const name = item.name ?? '';
  const isFolder = (item.nodeType ?? '').toLowerCase() === 'folder';

  const folderPrefix = apiFolder ? apiFolder.replace(/\/$/, '') + '/' : '';
  const rawPath =
    item.url ?? `files/${bucket}/${folderPrefix}${name}`;
  const path = isFolder && !rawPath.endsWith('/') ? `${rawPath}/` : rawPath;

  return {
    name,
    path,
    url: item.url,
    nodeType: isFolder ? 'FOLDER' : 'ITEM',
    bucket,
    parentPath: item.parentPath ?? (apiFolder ? apiFolder.replace(/\/$/, '') : undefined),
    contentType: isFolder ? undefined : item.contentType,
    contentLength: isFolder ? undefined : item.contentLength,
    updatedAt:
      item.updatedAt != null
        ? new Date(item.updatedAt).toISOString()
        : undefined,
    permissions: item.permissions,
    author: item.author ?? item.owner,
    folderId: isFolder
      ? `${bucket}:${path}`
      : `${bucket}:files/${bucket}/${folderPrefix}`,
  };
}

export async function listFiles(params: {
  bucket: string;
  path?: string;
  permissions?: boolean;
  recursive?: boolean;
}): Promise<ListFilesResponse> {
  const { bucket, path = '', permissions, recursive } = params;
  if (!bucket) return { items: [] };

  const qs = new URLSearchParams({ bucket, limit: '1000' });
  if (path) qs.set('path', path);
  if (permissions) qs.set('permissions', 'true');
  if (recursive) qs.set('recursive', 'true');

  const res = await fetch(`/api/dial-files/list?${qs}`);
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`DIAL ${res.status}: session expired`);
    }
    throw new Error(`DIAL ${res.status}`);
  }
  const data = (await res.json()) as { items?: CoreMetadataItem[]; permissions?: string[] };

  return {
    items: (data.items ?? []).map((item) => normalizeCoreItem(item, bucket, path)),
    permissions: data.permissions,
  };
}

export async function listPublicFiles(params?: {
  path?: string;
}): Promise<ListFilesResponse> {
  return listFiles({ bucket: 'public', path: params?.path, permissions: false });
}

export async function listSharedFiles(_params?: {
  path?: string;
}): Promise<ListFilesResponse> {
  const data = await dialPost<{ resources?: CoreMetadataItem[] }>(
    '/v1/ops/resource/share/list',
    { resourceTypes: ['FILE'], with: 'me', includeUserInfo: true },
  );

  const resources = data.resources ?? [];
  const items = resources.map((item) => {
    const bucket = item.bucket ?? '';
    return normalizeCoreItem(item, bucket, '');
  });

  return { items };
}

export async function createFolder(params: {
  bucket: string;
  parentPath?: string;
  name: string;
}): Promise<CreateFolderResponse> {
  const { bucket, parentPath, name } = params;
  const normalizedParent = parentPath ? parentPath.replace(/\/$/, '') + '/' : '';
  const folderPath = `${normalizedParent}${name}/`;
  const markerPath = `${folderPath}.dial_folder`;

  const encodedMarker = markerPath
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');

  const res = await fetch(`${PROXY}/v1/files/${bucket}/${encodedMarker}`, {
    method: 'PUT',
    body: new Blob([], { type: 'application/octet-stream' }),
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`createFolder failed: ${res.status}: session expired`);
    }
    throw new Error(`createFolder failed: ${res.status}`);
  }

  const resourcePath = `files/${bucket}/${folderPath}`;
  return {
    name,
    path: resourcePath,
    bucket,
    parentPath: normalizedParent.replace(/\/$/, '') || undefined,
    folderId: `${bucket}:${resourcePath}`,
  };
}

export async function deleteFiles(
  items: DeleteItemDto[],
): Promise<DeleteFilesResponse> {
  const results = await Promise.all(
    items.map(async (item) => {
      const relPath = item.nodeType === 'FOLDER'
        ? (item.path.endsWith('/') ? item.path : `${item.path}/`)
        : item.path.replace(/\/$/, '');

      const encoded = relPath
        .split('/')
        .filter(Boolean)
        .map((s) => encodeURIComponent(s))
        .join('/');

      try {
        if (item.nodeType === 'FOLDER') {
          await deleteFolderContents(item.bucket, relPath);
        }
        const res = await fetch(
          `${PROXY}/v1/files/${item.bucket}/${encoded}`,
          { method: 'DELETE' },
        );
        return { path: item.path, success: res.ok };
      } catch {
        return { path: item.path, success: false };
      }
    }),
  );
  return { results };
}

async function deleteFolderContents(bucket: string, folderPath: string): Promise<void> {
  try {
    const data = await dialGet<{ items?: CoreMetadataItem[] }>(
      `/v1/metadata/files/${bucket}/${folderPath.replace(/\/$/, '')}/?limit=1000`,
    );
    const children = data.items ?? [];
    await Promise.all(
      children.map(async (child) => {
        const isFolder = (child.nodeType ?? '').toLowerCase() === 'folder';
        const childName = child.name ?? '';
        const childPath = isFolder ? `${folderPath}${childName}/` : `${folderPath}${childName}`;
        if (isFolder) {
          await deleteFolderContents(bucket, childPath);
        }
        const encoded = childPath
          .split('/')
          .filter(Boolean)
          .map((s) => encodeURIComponent(s))
          .join('/');
        await fetch(`${PROXY}/v1/files/${bucket}/${encoded}`, { method: 'DELETE' });
      }),
    );
  } catch {
    // best-effort
  }
}

export async function renameFiles(
  items: RenameItemDto[],
): Promise<RenameFilesResponse> {
  const results = await Promise.all(
    items.map(async (item) => {
      const sourceUrl = `files/${item.bucket}/${item.sourcePath}`;
      const destinationUrl = `files/${item.bucket}/${item.destinationPath}`;
      try {
        await dialPost('/v1/ops/resource/move', {
          sourceUrl,
          destinationUrl,
          overwrite: false,
        });
        return { sourcePath: item.sourcePath, success: true };
      } catch {
        return { sourcePath: item.sourcePath, success: false };
      }
    }),
  );
  return { results };
}

export async function downloadFile(
  bucket: string,
  path: string,
): Promise<Response> {
  const encoded = path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  const res = await fetch(`${PROXY}/v1/files/${bucket}/${encoded}`);
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`Download failed: ${res.status}: session expired`);
    }
    throw new Error(`Download failed: ${res.status}`);
  }
  return res;
}

export async function downloadArchive(
  items: ArchiveItemDto[],
): Promise<Response> {
  if (items.length === 1 && items[0].nodeType === 'ITEM') {
    return downloadFile(items[0].bucket, items[0].path);
  }
  throw new Error('Multi-file archive download is not supported');
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  options?: {
    signal?: AbortSignal;
    uploadMode?: 'overwrite' | 'create-only';
    onProgress?: (percent: number) => void;
  },
): Promise<FileUploadResponse> {
  const { signal, uploadMode, onProgress } = options ?? {};

  const encodedPath = path
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/');
  const url = `${PROXY}/v1/files/${bucket}/${encodedPath}`;

  const conditionalHeader: Record<string, string> =
    uploadMode === 'create-only' ? { 'If-None-Match': '*' } : {};

  if (onProgress != null) {
    return new Promise<FileUploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      Object.entries(conditionalHeader).forEach(([k, v]) =>
        xhr.setRequestHeader(k, v),
      );

      if (signal) signal.addEventListener('abort', () => xhr.abort());

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const name = path.split('/').pop() ?? file.name;
          resolve({ name, path: `files/${bucket}/${path}`, bucket });
        } else {
          if (xhr.status === 401) window.location.reload();
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload network error')));
      xhr.addEventListener('abort', () =>
        reject(new DOMException('Upload aborted', 'AbortError')),
      );

      xhr.send(file);
    });
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream', ...conditionalHeader },
    body: file,
    signal,
  });

  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`Upload failed: ${res.status}: session expired`);
    }
    throw new Error(`Upload failed: ${res.status}`);
  }

  const name = path.split('/').pop() ?? file.name;
  return { name, path: `files/${bucket}/${path}`, bucket };
}
