import type { NotificationVariant } from '@epam/ai-dial-ui-kit';

export enum FileUploadStatus {
  Queued = 'queued',
  Uploading = 'uploading',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export interface FileUploadEntry {
  id: string;
  name: string;
  status: FileUploadStatus;
  percent?: number;
}

export interface FileUploadBatchState {
  files: FileUploadEntry[];
}

export interface FileUploadValidationResult {
  valid: boolean;
  message?: string;
}

export interface FileManagerNotification {
  variant: NotificationVariant;
  title?: string;
  message: string;
}

/** Where a "Shared with me" root actually lives: its owner's bucket and DIAL Core path. */
export interface SharedRootMeta {
  bucket: string;
  dialCorePath: string;
}
