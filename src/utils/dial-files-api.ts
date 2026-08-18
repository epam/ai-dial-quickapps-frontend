import {
  handleUnauthorized401,
  handleUnauthorizedResponse,
} from '@/utils/handle-unauthorized-response';

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

async function handleJsonResponse<T>(res: Response, action: string): Promise<T> {
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`${action} failed: ${res.status}: session expired`);
    }
    throw new Error(`${action} failed: ${res.status}`);
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
  const rawPath = item.url ?? `files/${bucket}/${folderPrefix}${name}`;
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
    updatedAt: item.updatedAt != null ? new Date(item.updatedAt).toISOString() : undefined,
    permissions: item.permissions,
    author: item.author ?? item.owner,
    folderId: isFolder ? `${bucket}:${path}` : `${bucket}:files/${bucket}/${folderPrefix}`,
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
  const data = await handleJsonResponse<{
    items?: CoreMetadataItem[];
    permissions?: string[];
  }>(res, 'List files');

  return {
    items: (data.items ?? []).map((item) => normalizeCoreItem(item, bucket, path)),
    permissions: data.permissions,
  };
}

export async function listPublicFiles(params?: { path?: string }): Promise<ListFilesResponse> {
  return listFiles({
    bucket: 'public',
    path: params?.path,
    permissions: false,
  });
}

export async function listSharedFiles(): Promise<ListFilesResponse> {
  const res = await fetch('/api/dial-files/list-shared');
  const data = await handleJsonResponse<{ resources?: CoreMetadataItem[] }>(
    res,
    'List shared files',
  );

  const resources = data.resources ?? [];
  const items = resources.map((item) => normalizeCoreItem(item, item.bucket ?? '', ''));

  return { items };
}

export async function createFolder(params: {
  bucket: string;
  parentPath?: string;
  name: string;
}): Promise<CreateFolderResponse> {
  const res = await fetch('/api/dial-files/create-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleJsonResponse<CreateFolderResponse>(res, 'Create folder');
}

export async function deleteFiles(items: DeleteItemDto[]): Promise<DeleteFilesResponse> {
  const res = await fetch('/api/dial-files/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map(({ bucket, path, nodeType }) => ({ bucket, path, nodeType })),
    }),
  });
  return handleJsonResponse<DeleteFilesResponse>(res, 'Delete files');
}

export async function renameFiles(items: RenameItemDto[]): Promise<RenameFilesResponse> {
  const res = await fetch('/api/dial-files/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map(({ bucket, sourcePath, destinationPath }) => ({
        bucket,
        sourcePath,
        destinationPath,
      })),
    }),
  });
  return handleJsonResponse<RenameFilesResponse>(res, 'Rename files');
}

export async function downloadFile(bucket: string, path: string): Promise<Response> {
  const qs = new URLSearchParams({ bucket, path });
  const res = await fetch(`/api/dial-files/download?${qs}`);
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`Download failed: ${res.status}: session expired`);
    }
    throw new Error(`Download failed: ${res.status}`);
  }
  return res;
}

export async function downloadArchive(items: ArchiveItemDto[]): Promise<Response> {
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

  const qs = new URLSearchParams({ bucket, path });
  if (uploadMode) qs.set('uploadMode', uploadMode);
  const url = `/api/dial-files/upload?${qs}`;

  const formData = new FormData();
  formData.append('file', file);

  if (onProgress != null) {
    return new Promise<FileUploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);

      if (signal) signal.addEventListener('abort', () => xhr.abort());

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const name = path.split('/').pop() ?? file.name;
          resolve({ name, path: `files/${bucket}/${path}`, bucket });
        } else {
          if (xhr.status === 401) handleUnauthorized401();
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload network error')));
      xhr.addEventListener('abort', () => reject(new DOMException('Upload aborted', 'AbortError')));

      xhr.send(formData);
    });
  }

  const res = await fetch(url, {
    method: 'PUT',
    body: formData,
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
