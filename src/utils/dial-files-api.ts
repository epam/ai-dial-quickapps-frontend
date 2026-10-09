import {
  CreateFolderResponseDto,
  DeleteFilesResponseDto,
  DeleteItemDtoNodeTypeEnum,
  ListFilesItemDto,
  RenameItemDtoNodeTypeEnum,
  UploadFileUploadModeEnum,
} from '@epam/ai-dial-chat-api-client';

import {
  type ArchiveItemDto,
  type CreateFolderResponse,
  type DeleteFilesResponse,
  type DeleteItemDto,
  type FileUploadResponse,
  FilesApiNodeType,
  type ListFilesItem,
  type ListFilesResponse,
  type RenameFilesResponse,
  type RenameItemDto,
} from '@/types/dial-files';
import { chatApiFetch, getCsrfToken } from '@/utils/chat-api-fetch';
import { filesApi } from '@/utils/chat-api-client';
import {
  handleUnauthorized401,
  handleUnauthorizedResponse,
} from '@/utils/handle-unauthorized-response';

/**
 * chat-api's `ListFilesItemDto` already carries `folderId`, camelCase fields
 * and a synthesized `path` — the only real gaps vs. this app's `ListFilesItem`
 * are the lowercase `nodeType` enum and `updatedAt` being epoch ms rather
 * than an ISO string.
 */
const normalizeFileItem = (item: ListFilesItemDto): ListFilesItem => ({
  name: item.name,
  path: item.path,
  url: item.url,
  nodeType: item.nodeType === 'folder' ? FilesApiNodeType.Folder : FilesApiNodeType.Item,
  bucket: item.bucket,
  folderId: item.folderId,
  parentPath: item.parentPath,
  contentType: item.contentType,
  contentLength: item.contentLength,
  updatedAt: item.updatedAt != null ? new Date(item.updatedAt).toISOString() : undefined,
  permissions: item.permissions,
  author: item.author,
  resourceType: item.resourceType,
});

export const listFiles = async (params: {
  bucket: string;
  path?: string;
  permissions?: boolean;
  recursive?: boolean;
}): Promise<ListFilesResponse> => {
  const { bucket, path, permissions, recursive } = params;
  if (!bucket) return { items: [] };

  const data = await filesApi.listFiles({ bucket, path, permissions, recursive, limit: 1000 });
  return { items: data.items.map(normalizeFileItem), permissions: data.permissions };
};

export const listPublicFiles = async (params?: { path?: string }): Promise<ListFilesResponse> => {
  const data = await filesApi.listPublicFiles({ path: params?.path, limit: 1000 });
  return { items: data.items.map(normalizeFileItem) };
};

export const listSharedFiles = async (): Promise<ListFilesResponse> => {
  const data = await filesApi.listSharedFiles();
  return { items: data.items.map(normalizeFileItem) };
};

export const createFolder = async (params: {
  bucket: string;
  parentPath?: string;
  name: string;
}): Promise<CreateFolderResponse> => {
  const data: CreateFolderResponseDto = await filesApi.createFolder({
    createFolderDto: params,
  });
  return data;
};

export const deleteFiles = async (items: DeleteItemDto[]): Promise<DeleteFilesResponse> => {
  const data: DeleteFilesResponseDto = await filesApi.deleteFiles({
    deleteFilesDto: {
      items: items.map(({ bucket, path, name, nodeType }) => ({
        bucket,
        path,
        name,
        nodeType:
          nodeType === FilesApiNodeType.Folder
            ? DeleteItemDtoNodeTypeEnum.Folder
            : DeleteItemDtoNodeTypeEnum.Item,
      })),
    },
  });
  return { results: data.results.map(({ path, success }) => ({ path, success })) };
};

export const renameFiles = async (items: RenameItemDto[]): Promise<RenameFilesResponse> => {
  const data = await filesApi.renameFiles({
    renameFilesDto: {
      items: items.map(({ bucket, sourcePath, destinationPath, name, nodeType }) => ({
        bucket,
        sourcePath,
        destinationPath,
        name,
        nodeType:
          nodeType === FilesApiNodeType.Folder
            ? RenameItemDtoNodeTypeEnum.Folder
            : RenameItemDtoNodeTypeEnum.Item,
      })),
    },
  });
  return {
    results: data.results.map(({ sourcePath, success }) => ({ sourcePath, success })),
  };
};

// Hand-written (not routed through the generated FilesApi, whose
// `downloadFile()` resolves a `Blob`) — callers need the raw streaming
// `Response` to drive `triggerBrowserDownload`.
export const downloadFile = async (bucket: string, path: string): Promise<Response> => {
  const qs = new URLSearchParams({ bucket, path });
  const res = await chatApiFetch(`/api/v1/files/download?${qs}`);
  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`Download failed: ${res.status}: session expired`);
    }
    throw new Error(`Download failed: ${res.status}`);
  }
  return res;
};

export const downloadArchive = async (items: ArchiveItemDto[]): Promise<Response> => {
  if (items.length === 1 && items[0].nodeType === FilesApiNodeType.Item) {
    return downloadFile(items[0].bucket, items[0].path);
  }
  // chat-api exposes an archive-download endpoint (FilesApi.downloadArchive),
  // but multi-item downloads do not use it yet.
  throw new Error('Multi-file archive download is not supported');
};

// Kept hand-written rather than routed through the generated client: the
// `XMLHttpRequest` progress path is a hard requirement of the file manager
// UI that a generated OpenAPI client doesn't support.
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: {
    signal?: AbortSignal;
    uploadMode?: 'overwrite' | 'create-only';
    onProgress?: (percent: number) => void;
  },
): Promise<FileUploadResponse> => {
  const { signal, onProgress } = options ?? {};
  // chat-api defaults `uploadMode` to 'overwrite' when omitted — always send
  // an explicit value so this app's create-only-by-default semantics survive.
  const uploadMode = options?.uploadMode ?? UploadFileUploadModeEnum.CreateOnly;
  const url = '/api/v1/files';

  // chat-api's uploadFile takes bucket/path/uploadMode as multipart form
  // fields, not query params — see FilesApi.uploadFileRaw.
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  formData.append('path', path);
  formData.append('uploadMode', uploadMode);

  if (onProgress != null) {
    return new Promise<FileUploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.withCredentials = true;
      const csrfToken = getCsrfToken();
      if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);

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

  const res = await chatApiFetch(url, { method: 'POST', body: formData, signal });

  if (!res.ok) {
    if (handleUnauthorizedResponse(res)) {
      throw new Error(`Upload failed: ${res.status}: session expired`);
    }
    throw new Error(`Upload failed: ${res.status}`);
  }

  const name = path.split('/').pop() ?? file.name;
  return { name, path: `files/${bucket}/${path}`, bucket };
};
