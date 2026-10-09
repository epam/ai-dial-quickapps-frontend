/** Node kind in this app's file listings (chat-api's own DTOs use lowercase values). */
export enum FilesApiNodeType {
  Item = 'ITEM',
  Folder = 'FOLDER',
}

export interface ListFilesItem {
  name: string;
  path: string;
  url?: string;
  nodeType: FilesApiNodeType;
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
  nodeType: FilesApiNodeType;
}

export interface DeleteFilesResponse {
  results: Array<{ path: string; success: boolean }>;
}

export interface RenameItemDto {
  bucket: string;
  sourcePath: string;
  destinationPath: string;
  nodeType: FilesApiNodeType;
  name: string;
}

export interface RenameFilesResponse {
  results: Array<{ sourcePath: string; success: boolean }>;
}

export interface ArchiveItemDto {
  bucket: string;
  path: string;
  name: string;
  nodeType: FilesApiNodeType;
}

export interface FileUploadResponse {
  name: string;
  path: string;
  bucket: string;
}

export enum DownloadDestinationType {
  Blob = 'blob',
  Stream = 'stream',
  Cancelled = 'cancelled',
}
