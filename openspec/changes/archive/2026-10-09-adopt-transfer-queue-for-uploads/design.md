# Design

## Context

- Uploads are run by `useDialFileManager.onUploadFiles` (`src/hooks/use-dial-file-manager.ts`): one `AbortController` per batch, `UPLOAD_CONCURRENCY` workers, per-file state in `uploadBatchState` (`FileUploadEntry`: `Queued | Uploading | Completed | Failed | Cancelled`, `percent`). The state is set to `null` as soon as the batch ends.
- `useDialFileSources` (`src/hooks/use-dial-file-sources.ts`) runs one such hook per source (My files, Shared, Organization). The All view exposes the first non-null batch; a single-source view exposes only its own source's batch.
- `FileManagerModal` renders `UploadProgressModal` while the batch is non-null; its only control is Cancel (abort the batch and clear it). Add is disabled while the batch is non-null.
- `TransferQueue` (kit 2.0, confirmed via the ui-kit MCP): props `title`, `items: { id, name, status, percent?, message? }[]`, `onClose`, `onCancelItem?`, `labels?`, `autoCloseDelay?` (default `TRANSFER_QUEUE_AUTO_CLOSE_DELAY_MS`, 8 s). Close while an item is in progress or failed asks for confirmation before `onClose`. Positioning is the host's.
- The kit `Popup` wraps its content in a modal `FloatingFocusManager` and dismisses on outside press, so anything rendered outside the popup's floating element would be hidden from assistive tech and a click on it would close the popup.

## Decisions

1. **Rendered inside the popup, fixed to the viewport corner.** The queue is a child of `Popup`'s content in a `fixed bottom-4 end-4` wrapper (`w-[400px] max-w-[calc(100vw-2rem)]`). The popup surface has no transform, so `fixed` resolves against the viewport, and the queue stays inside the focus manager and the outside-press boundary.

2. **Status mapping** (pure `toTransferQueueItems` in `src/utils/dial-file-manager.ts`): `Queued`/`Uploading` → `InProgress` (percent only while uploading), `Completed` → `Success`, `Failed` → `Failed`, `Cancelled` → `Canceled`.

3. **Per-file cancel.** The hook keeps one `AbortController` per file (map in a ref) instead of one per batch, plus a batch-cancelled flag. `cancelUploadItem(id)` aborts that file's controller, or marks a queued file so the worker skips it. `cancelUpload()` sets the flag and aborts every file controller. A file whose request is aborted ends as `Cancelled`. The end-of-batch notifications are skipped only when the whole batch was cancelled, as today.

4. **Batch survives its end.** `onUploadFiles` no longer clears `uploadBatchState`; the queue clears it through `onClose` (the user, or the kit's auto-close when all succeeded). The listing refresh at the end of the batch is unchanged. `isOpen` on `FileUploadBatchState` is dropped — presence of the state is what shows the queue.

5. **One queue across sources.** `useDialFileSources` exposes the same batch, `cancelUpload`, `cancelUploadItem`, `clearUploadBatch` and `onUploadFiles` in every view (single source and All): the batch is the first non-null one, and starting an upload in one source clears the other sources' finished batches first, so at most one batch exists.

6. **Input lock while uploading.** `FileManagerModal` derives `isUploading` (some entry `Queued` or `Uploading`). While true, the `DialFileManager` wrapper is `inert` and `aria-busy`, and Add is disabled. A finished queue no longer disables anything.

7. **i18n.** `DialFileManagerI18nKeys.UploadProgressTitle` stays the queue title. New `common` keys under `dialFileManager.transferQueue.*` fill every `TransferQueueLabels` field (functions interpolate `{{name}}`, `{{completed}}`, `{{total}}`). `UploadProgressSummary` is removed.

## Risks / Trade-offs

- [Queue overlaps the popup footer on small screens] → it sits at the viewport corner like other kit queues and can be collapsed; accepted.
- [`inert` support] → supported by every target browser and by jsdom's attribute; the tests assert the attribute, not focus behavior.
- [Upload code had no tests] → hook tests for status flow, per-file cancel, batch cancel and batch retention are added before the UI swap.
