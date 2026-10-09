import { NotificationVariant } from '@epam/ai-dial-ui-kit';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DialFileManagerI18nKeys } from '@/constants/i18n';
import type { UseDialFileManagerResult } from '@/hooks/use-dial-file-manager';
import { useDialFileSources } from '@/hooks/use-dial-file-sources';
import { FileUploadStatus, type FileUploadBatchState } from '@/types/file-manager';

import FileManagerModal from '../FileManagerModal';

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, string>) =>
      options?.name == null ? key : `${key}:${options.name}`,
    language: 'en',
  }),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => ({ user: { bucket: 'mine' } }),
}));
vi.mock('@/hooks/use-dial-file-sources', () => ({ useDialFileSources: vi.fn() }));
// The browser itself is not under test here; a stub keeps the popup fast to mount.
vi.mock('@epam/ai-dial-react-file-manager', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@epam/ai-dial-react-file-manager')>()),
  DialFileManager: () => <div data-testid="file-manager" />,
}));

const cancelUpload = vi.fn();
const cancelUploadItem = vi.fn();
const clearUploadBatch = vi.fn();

const sources = (uploadBatchState: FileUploadBatchState | null) =>
  ({
    items: [],
    isLoading: false,
    error: null,
    path: '/My files',
    onPathChange: vi.fn(),
    retry: vi.fn(),
    onUploadFiles: vi.fn(),
    onValidateUpload: vi.fn(),
    uploadBatchState,
    cancelUpload,
    cancelUploadItem,
    clearUploadBatch,
    onCreateFolder: vi.fn(),
    onCreateFolderValidate: vi.fn(),
    isCreatingFolder: false,
    onDownloadFiles: vi.fn(),
    isDownloading: false,
    onDeleteFiles: vi.fn(),
    isDeleting: false,
    onRenameValidate: vi.fn(),
    onMoveToFiles: vi.fn(),
    isRenaming: false,
    isUploadEnabled: true,
    isNewButtonDisabled: false,
    disabledNewButtonTooltip: '',
    visibleColumns: [],
    dateLocale: 'en',
    dateOptions: {},
    actionLabels: {},
    sharedWithMeIds: undefined,
  }) as unknown as UseDialFileManagerResult;

const batch = (...statuses: FileUploadStatus[]): FileUploadBatchState => ({
  files: statuses.map((status, i) => ({ id: `id-${i}`, name: `file-${i}.pdf`, status })),
});

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const renderWith = (state: FileUploadBatchState | null) => {
  vi.mocked(useDialFileSources).mockReturnValue(sources(state));
  act(() => root.render(<FileManagerModal isOpen onClose={vi.fn()} />));
};

const dialog = () => document.body.querySelector('[role="dialog"]') as HTMLElement;
const browser = () => dialog().querySelector('[data-testid="file-manager"]')?.parentElement;
const queue = () => dialog().querySelector('[role="status"]');
const button = (label: string) =>
  [...dialog().querySelectorAll('button')].find(
    (node) => node.getAttribute('aria-label') === label || node.textContent?.trim() === label,
  ) as HTMLButtonElement | undefined;

describe('FileManagerModal upload queue', () => {
  it('shows no queue without an upload', () => {
    renderWith(null);

    expect(queue()).toBeNull();
    expect(browser()?.hasAttribute('inert')).toBe(false);
  });

  it('lists every file of the batch inside the popup under the upload title', () => {
    renderWith(batch(FileUploadStatus.Uploading, FileUploadStatus.Queued));

    expect(queue()).not.toBeNull();
    expect(dialog().textContent).toContain(DialFileManagerI18nKeys.UploadProgressTitle);
    expect(dialog().textContent).toContain('file-0.pdf');
    expect(dialog().textContent).toContain('file-1.pdf');
  });

  it('locks the browser and Add while a file is uploading', () => {
    renderWith(batch(FileUploadStatus.Uploading, FileUploadStatus.Completed));

    expect(browser()?.hasAttribute('inert')).toBe(true);
    expect(browser()?.getAttribute('aria-busy')).toBe('true');
    expect(button(DialFileManagerI18nKeys.Add)?.disabled).toBe(true);
  });

  it('unlocks the browser once nothing is uploading, while the queue stays', () => {
    renderWith(batch(FileUploadStatus.Completed, FileUploadStatus.Failed));

    expect(queue()).not.toBeNull();
    expect(browser()?.hasAttribute('inert')).toBe(false);
  });

  it('cancels a single file from its row', () => {
    renderWith(batch(FileUploadStatus.Uploading));

    act(() => button(`${DialFileManagerI18nKeys.QueueCancelItem}:file-0.pdf`)?.click());

    expect(cancelUploadItem).toHaveBeenCalledWith('id-0');
    expect(cancelUpload).not.toHaveBeenCalled();
  });

  it('cancels and clears the batch when a finished queue is closed', () => {
    renderWith(batch(FileUploadStatus.Completed, FileUploadStatus.Cancelled));

    act(() => button(DialFileManagerI18nKeys.QueueClose)?.click());

    expect(cancelUpload).toHaveBeenCalledTimes(1);
    expect(clearUploadBatch).toHaveBeenCalledTimes(1);
  });

  it('asks before closing while a file is still uploading', () => {
    renderWith(batch(FileUploadStatus.Uploading));

    act(() => button(DialFileManagerI18nKeys.QueueClose)?.click());

    expect(clearUploadBatch).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain(DialFileManagerI18nKeys.QueueCloseConfirmHeader);
  });
});

describe('FileManagerModal notifications', () => {
  const liveRegion = () => dialog().querySelector('[aria-live="polite"][aria-atomic="true"]');
  const notify = (notification: { variant: NotificationVariant; message: string }) => {
    const { onNotification } = vi.mocked(useDialFileSources).mock.calls[0][0];
    act(() => onNotification?.(notification));
  };

  it('renders the polite live region before any notification appears', () => {
    renderWith(null);

    expect(liveRegion()).not.toBeNull();
    expect(liveRegion()?.textContent).toBe('');
  });

  it('announces an error notification as an alert inside the live region', () => {
    renderWith(null);

    notify({ variant: NotificationVariant.Error, message: 'Failed to create folder' });

    const alert = liveRegion()?.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe('Failed to create folder');
  });

  it('announces a success notification politely, without the alert role', () => {
    renderWith(null);

    notify({ variant: NotificationVariant.Success, message: 'Uploaded' });

    expect(liveRegion()?.textContent).toBe('Uploaded');
    expect(liveRegion()?.querySelector('[role="alert"]')).toBeNull();
  });
});
