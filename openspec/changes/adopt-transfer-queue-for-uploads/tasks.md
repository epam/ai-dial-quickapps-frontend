# Tasks

Slicing strategy: hook first (behavior with tests), then the UI swap. Follow `AGENTS.md`, `.claude/rules/all-ts.md`, `all-tsx.md`, `rtl.md`. Do not commit.

## 1. Upload state

- [x] 1.1 In `src/hooks/use-dial-file-manager.ts`: one `AbortController` per file, `cancelUploadItem(id)`, batch cancel via flag + abort all, keep `uploadBatchState` after the batch ends; drop `isOpen` from `FileUploadBatchState` (`src/types/file-manager.ts`). Verify: new cases in `src/hooks/tests/use-dial-file-manager.test.tsx` (status flow to completed, one failed file, cancel one file, cancel batch skips notifications, state kept after end, clear removes it).
- [x] 1.2 In `src/hooks/use-dial-file-sources.ts`: expose one batch and the upload handlers in every view; starting an upload clears the other sources' batches. Verify: `src/hooks/tests/use-dial-file-sources.test.tsx` (single-source view sees another source's batch; `cancelUploadItem` reaches the sources; upload clears other batches).
- [x] 1.3 Add pure `toTransferQueueItems` to `src/utils/dial-file-manager.ts`. Verify: `src/utils/tests/dial-file-manager.test.ts` covers every status.

## 2. UI

- [x] 2.1 Strings: `dialFileManager.transferQueue.*` keys in `src/constants/i18n.ts` and `src/i18n/locales/common.json`; remove `uploadProgressSummary`.
- [x] 2.2 In `FileManagerModal.tsx` render `TransferQueue` inside the popup in a `fixed bottom-4 end-4` wrapper; `onCancelItem` → `cancelUploadItem`, `onClose` → cancel + clear; `inert`/`aria-busy` on the browser and Add disabled only while a file is in progress. Delete `UploadProgressModal.tsx`. Verify: `src/components/common/FilesSelector/tests/FileManagerModal.upload.test.tsx` (queue rows and title, cancel item, close calls cancel + clear, close confirmation while uploading, inert and Add disabled while uploading, browser unlocked after the batch ends).

## 3. Integration

- [x] 3.1 `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`; `rg "\b(ml|mr|pl|pr|left|right)-" src/components/common/FilesSelector`.
