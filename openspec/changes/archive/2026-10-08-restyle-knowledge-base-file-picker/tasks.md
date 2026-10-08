# Tasks

Slicing strategy: risk-first — settle the two uncertain pieces (row checkboxes, All tab) before the cosmetic shell. Each group lands its own tests, strings and docs. Follow `AGENTS.md`, `.claude/rules/all-ts.md`, `all-tsx.md`, `rtl.md`. Do not commit.

## 1. Strings

- [x] 1.1 In `src/constants/i18n.ts` (`DialFileManagerI18nKeys`) and `src/i18n/locales/common.json` add `AddTitle` ("Add knowledge base file"), `Add` ("Add"), `SearchPlaceholder` ("Search in {{folder}}..."), `TabAll` ("All"), `TabsAriaLabel`, `AddDisabledAtAllRoot`, `CrossSourceMoveNotAllowed`; change `tab.shared` to "Shared". Verify: `npm run typecheck`, `npm run lint` on the touched files.

## 2. Row checkboxes (risk)

- [x] 2.1 Find why the grid shows no selection column with the current `gridOptions` (`selectionMode`, `additionalGridOptions.rowSelection`, `visibleColumns`) by rendering the modal in a Vitest/jsdom test, then in the browser; fix it in `FileManagerModal.tsx` options only. If the cause is in the library or kit, stop and report. Verify: `npx vitest run src/components/common/FilesSelector/tests/FileManagerModal.test.tsx` asserts a checkbox per selectable row, a header select-all, and no checkbox for a hidden-path row.

## 3. All tab (risk)

- [x] 3.1 Add the `isEnabled` option (default `true`) to `useDialFileManager` in `src/hooks/use-dial-file-manager.ts` so an instance skips its first listing until enabled, and keep tab-change reloading intact. Verify: `npx vitest run src/hooks/tests/use-dial-file-manager.test.tsx` with new cases (disabled instance lists nothing; enabling lists once; existing cases still pass).
- [x] 3.2 Add the pure router in `src/utils/dial-file-manager.ts` (`resolveSourceByPath`: virtual path -> source tab, plus a helper that groups items by source). Verify: new cases in `src/utils/tests/dial-file-manager.test.ts` (each root prefix, nested path, trailing slash, unknown path, grouping of mixed items).
- [x] 3.3 In `FileManagerModal.tsx` run one hook instance per source and compose the All view: concatenated root folders, modal-owned path, and every handler routed through the router to the owning instance (`onPathChange`, `onUploadFiles`, `onCreateFolder`, `onCreateFolderValidate`, `onRenameValidate`, `onMoveToFiles`, `onDeleteFiles`, `onDownloadFiles`); take permissions, columns, `uploadEnabled`, `isNewButtonDisabled` and tooltip from the instance owning the current folder; OR the busy flags; refuse cross-source moves with a notification. Keep the three single-source views unchanged. Verify: `npx vitest run src/components/common/FilesSelector/tests/FileManagerModal.test.tsx` covers the four chips, the id reported for an Organization file under All equals the Organization tab's, upload/new folder/rename/delete/move/download each reaching the right source from All, Shared without WRITE offering no write actions under All, cross-source move refused with nothing sent, mixed-source delete/download, Add disabled only at All's top level, and selection cleared on tab switch.

## 4. Shell, footer, tabs, search

- [x] 4.1 Restyle the popup in `FileManagerModal.tsx`: `header` = `AddTitle`, close control shown, `headerDivider`/`footerDivider`, default surface (remove the `bg-layer-sunken` classes), footer via `additionalButtons` (Cancel, link) and `mainButtons` (Add, neutral, same disabled rule as Attach). Verify: modal tests assert the title, close control, both buttons and Add disabled until a row is selected, then confirm reports the same ids as before (folder expansion, hidden files excluded).
- [x] 4.2 Configure the library: `treeOptions.header: ''` with `tabsAriaLabel`, tabs All / My files / Shared / Organization (Review removed), `gridOptions.filterable: false`, `navigationPanelOptions { searchable: true, placeholder }` from the current folder name. Verify: modal tests assert no "Files" heading, the four chips with My files selected, a search field with the folder placeholder that filters loaded rows case-insensitively, and no filter inputs; update the existing tests that expect the old title/labels.
- [x] 4.3 Remove the now-unused `Title`, `Attach` (file manager) and `FoldersPanelTitle` keys from `src/constants/i18n.ts` and `common.json` after `rg` confirms no usage. Verify: `npm run typecheck` and `npm run lint` clean.

## 5. RTL, docs and integration

- [x] 5.1 RTL pass: confirm the modal adds no physical-direction classes and that the popup renders under `dir="rtl"` without horizontal overflow (test with the document `dir` set). Verify: a modal test and `rg "\b(ml|mr|pl|pr|left|right)-" src/components/common/FilesSelector`.
- [x] 5.2 Update `docs/TECH_DEBT.md` with three entries: (1) search tech debt - the popup search filters only folders already loaded (library built-in filter, no `onSearchFiles`), so files in unopened folders are not found; the fix needs server-side or recursive search for My files, Shared and Organization (`listPublicFiles` and `listSharedFiles` have no `recursive`) wired through `onSearchFiles` / `searchResults`; (2) the Add-button "+" icon needs a toolbar icon prop in `@epam/ai-dial-react-file-manager`; (3) cross-source move/copy under All is refused. Verify: the diff shows only those entries, each naming the files involved.
- [ ] 5.3 Integration check: run the full `npm test`, `npm run lint`, `npm run typecheck` and `npm run build`, then open the popup in the dev server and compare with the target screen (tabs, search, no filter row, checkboxes, footer). Verify: all four commands succeed and the visual check matches.
