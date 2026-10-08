# Proposal

## Why

Uploading files in the Knowledge base popup opens `UploadProgressModal` (`src/components/common/FilesSelector/UploadProgressModal.tsx`), a second modal stacked on the popup and built from 1.0 kit components (`DialPopup`, `DialButton`, `DialFileName`) with a hand-made progress bar. The kit now ships `TransferQueue` (2.0), the design-system panel for exactly this: per-file status, per-file cancel, an aggregate progress bar, a close confirmation while work is pending, and auto-close once everything succeeded. The custom modal also vanishes the moment the batch ends, so a failed file is reported only by a transient notification.

## What Changes

- Replace `UploadProgressModal` with the kit `TransferQueue`, anchored to the bottom-end corner of the viewport inside the Knowledge base popup. Delete `UploadProgressModal.tsx`.
- Each file is shown with its own status: in progress (with percent once known), completed, failed, canceled.
- Each in-progress file can be canceled on its own; closing the queue while files are still uploading or have failed asks for confirmation, then cancels whatever is still running.
- The queue stays after the batch ends: when every file succeeded it closes itself after the kit delay; a failed or canceled row keeps it open until the user closes it.
- While any file is still uploading the file browser does not accept input (as today, where the stacked modal blocked it) and Add stays disabled. Once nothing is running, the browser is usable again even while the queue is still shown.
- Starting a new upload replaces the previous, finished queue. The queue is shared by all source tabs, so switching tabs after an upload keeps it visible.
- Every queue string goes through i18n (`common` namespace).

Alternatives considered: (a) keep the custom modal and restyle it on 2.0 `Popup` — rejected, it would re-implement what `TransferQueue` already owns; (b) let the user keep browsing during an upload — rejected for now, rename/delete/move of the destination folder while files stream in would need its own rules; the input lock is kept from today's behavior.

Not breaking: upload requests, destinations, overwrite rules and the success/failure notifications are unchanged. Rollback: revert the change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application_knowledge-base`: adds a requirement for upload progress in the popup.

## Impact

- Changed: `src/components/common/FilesSelector/FileManagerModal.tsx`, `src/hooks/use-dial-file-manager.ts`, `src/hooks/use-dial-file-sources.ts`, `src/constants/i18n.ts`, `src/i18n/locales/common.json`, their tests.
- Removed: `src/components/common/FilesSelector/UploadProgressModal.tsx`; the `dialFileManager.uploadProgressSummary` key.
- No new dependency (`TransferQueue` is in the installed `@epam/ai-dial-ui-kit` 0.15.0-dev.55), no chat-api change.
- RTL: the anchor uses logical `end-*`; the kit panel is direction-aware.
