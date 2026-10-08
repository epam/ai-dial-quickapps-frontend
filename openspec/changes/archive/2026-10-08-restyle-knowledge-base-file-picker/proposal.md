# Proposal

## Why

The Knowledge base row (change `redesign-knowledge-base-addon`) still opens the legacy "DIAL file system" popup: grey sunken surface, a "Files" heading over the tree, a per-column filter row in the grid, no search field, no row checkboxes, and an "Attach" footer. The target design titles the popup "Add knowledge base file" and restyles it like the other editor popups, so the picker no longer matches the row that opens it.

## What Changes

- Popup shell (`src/components/common/FilesSelector/FileManagerModal.tsx:396`): title "Add knowledge base file", visible close (X) control, header and footer dividers, default popup surface instead of `!bg-layer-sunken`. Footer built with the kit `Popup` `additionalButtons` / `mainButtons`: **Cancel** as a primary link-appearance button, **Add** as the neutral main button (replaces "Attach"), same pattern as `ConversationStartersModal`.
- Left panel: no "Files" heading (`treeOptions.header` omitted); chip tabs **All · My files · Shared · Organization**. **All** is new: one tree and grid with a top-level folder per source (My files, Shared, Organization), and every item there keeps the same functionality as in its own tab (open, select, upload, new folder, rename, delete, move, download, permissions).
- Right panel: keep the Show hidden files toggle and the Add (upload / new folder) dropdown; add a search field ("Search in <folder>...") with the Sort menu beside it; remove the grid filter row; rows selectable with checkboxes, including select-all in the header.
- Shared tab label becomes "Shared" (was "Shared with me") to match the design.
- Everything is configured through existing `DialFileManager` and `Popup` props. No file-manager library change.
- Out of scope / follow-up: the "+" icon on the toolbar Add button. The installed file-manager (0.3.0-dev.25) renders a plain `ButtonDropdown` (`label`, `variant`, `items`) with no icon prop, so the icon is skipped (user decision) and recorded in `docs/TECH_DEBT.md` as a library ask.

Alternatives considered: (a) a custom picker built from kit components — rejected, it would fork the upload/rename/delete/permission logic the library already owns; (b) configure the library (chosen). For **All**: (a) one merged listing in the existing cache — rejected, Shared needs owner-bucket path resolution (`resolveOwnerCoords`) that does not generalise to a merged key space; (b) one hook instance and cache per source with the roots built side by side and every handler routed by the item's root label (chosen).

Not breaking: stored context-file ids and the confirm/dismiss contract of the modal are unchanged. Rollback: revert the change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application_knowledge-base`: adds requirements for the popup's presentation, footer, source tabs including All, search/sort/no filter row, checkbox selection, and localization. The existing "Add opens the file-manager popup" requirement stays as is.

## Impact

- Changed: `src/components/common/FilesSelector/FileManagerModal.tsx`, `src/hooks/use-dial-file-manager.ts`, `src/utils/dial-file-manager.ts`, `src/constants/i18n.ts`, `src/i18n/locales/common.json`, and their tests (`src/hooks/tests/use-dial-file-manager.test.tsx`, `src/utils/tests/dial-file-manager.test.ts`, new `src/components/common/FilesSelector/tests/FileManagerModal.test.tsx`).
- Docs: `docs/TECH_DEBT.md` (Add button icon; search covers loaded folders only; cross-source move under All).
- No new dependency, no chat-api endpoint added or changed (All reuses `listFiles`, `listSharedFiles`, `listPublicFiles`).
- i18n: new `common` keys for the title, Add, All tab and search placeholder; the Shared tab text changes; unused `Title`, `Attach`, `FoldersPanelTitle` keys are removed.
- RTL: the popup and library are direction-aware; no physical classes are added.
