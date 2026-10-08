# Design

## Context

- The popup is `FileManagerModal` (`src/components/common/FilesSelector/FileManagerModal.tsx`), used only by `KnowledgeBaseRow` (`src/components/KnowledgeBase/KnowledgeBaseRow.tsx:54`; checked with grep). It wraps `DialFileManager` from `@epam/ai-dial-react-file-manager` (installed 0.3.0-dev.25; the sibling source in `../ai-dial-react-file-manager` was read to confirm which props exist) inside the kit `Popup`.
- Data comes from `useDialFileManager` (`src/hooks/use-dial-file-manager.ts`): one instance holds one flat per-folder cache for the active tab, builds a single root `DialFile` named by `rootLabel` (`:209`), and reloads when `activeTab` changes (`:158`). Shared needs owner-bucket path resolution (`resolveOwnerCoords`, `src/utils/dial-file-manager.ts`).
- Library facts relied on: `treeOptions.header` defaults to "Files" only when undefined is passed (`FileManager.tsx:804`) — an empty string hides it; `navigationPanelOptions.searchable` (default true) renders the search bar and `placeholder` is forwarded; with no `onSearchFiles` the library filters the already-loaded tree by name (`use-file-search.ts:44,177`); `gridOptions.filterable` (default true) draws the filter row; the kit `Grid` draws its own checkbox column when `gridOptions.selectionMode` is set and merges `additionalGridOptions.rowSelection` into its config; a host passing several roots in `items` gets one top-level folder each; the toolbar's Add button takes `newButtonLabel`/`newButtonVariant` but no icon (`DialFileManagerToolbar.tsx:86`).
- See `proposal.md` for motivation. The kit `Popup` footer API (`mainButtons`, `additionalButtons`, `headerDivider`, `footerDivider`) is confirmed through the ui-kit MCP and already used by `ConversationStartersModal`.

## Goals / Non-Goals

**Goals:**
- Match the target popup using library and `Popup` props only.
- Add an All tab without changing what ids the modal reports or how My files / Shared / Organization behave.

**Non-Goals:**
- A "+" icon on Add (no library prop; follow-up).
- Server-side or recursive search; search covers folders already loaded.
- Cross-source move/copy under All (refused with a notification).
- Any change to the sibling library.

## Decisions

1. **Popup shell through `Popup` props.** Drop `className`'s `!bg-layer-sunken`, the inner `bg-layer-sunken` wrappers and `hideClose`; keep a fixed height (`!h-[min(800px,100dvh)]`) so the grid scrolls inside; set `headerDivider`, `footerDivider`, `closeAriaLabel` (existing `CloseDialog` key), `size={PopupSize.Lg}`. Footer via `additionalButtons` (Cancel, `ButtonVariant.Primary` + `ButtonAppearance.Link`) and `mainButtons` (Add, `ButtonVariant.Neutral`, `disabled` as today). Alternative: keep the custom `footer` node — rejected, the data-driven footer is the editor's convention.

2. **Tree and tabs.** Pass `treeOptions.header: ''` (leaving it undefined would restore "Files") and give `tabsAriaLabel` for the chip row. Tabs list = all `DialFileManagerTabs` values except `Review`; `All` label from a new key.

3. **Grid and search.** `gridOptions.filterable: false`; `navigationPanelOptions: { searchable: true, placeholder }` with `placeholder = t('dialFileManager.searchPlaceholder', { folder })` where `folder` is the last segment of the current path (the root label at the top); sort menu stays at its default (`sortOptions` untouched). Search uses the library's built-in client-side filter over loaded folders. Alternative: `onSearchFiles` with recursive `listFiles` — rejected for now, only My files supports `recursive` here (`listPublicFiles` and `listSharedFiles` do not), so behaviour would differ per tab; logged in `docs/TECH_DEBT.md`.

4. **Checkboxes.** `selectionMode: GridSelectionMode.MULTIPLE` is already passed and the kit draws its own selection column (and header select-all) from it; `additionalGridOptions.rowSelection` is merged, not replacing it, but the current build shows no checkboxes, so the first task verifies why (selection column hidden by a kit class, `isRowSelectable`, or the `visibleColumns` list) and fixes it in this app's options. If the cause is inside the library or kit, stop and report rather than patch around it.

5. **All = three hook instances, composed in the modal.** Instead of generalising the single-cache hook (Shared's owner-bucket resolution does not fit a merged key space), the modal runs `useDialFileManager` once per source, each with a fixed `activeTab` and its own `rootLabel` (My files, Shared, Organization — distinct labels keep virtual paths unique). A new `isEnabled` option (default `true`) defers an instance's first listing until its tab is first needed, so opening on My files does not load Shared/Organization. The modal exposes one "active view":
   - My files / Shared / Organization: that instance's items, path, loading, error and handlers, unchanged.
   - All: `items` = the three instances' root folders concatenated; the current path is modal state. Every handler the library calls carries virtual paths that start with a source's root label, so a small router (`resolveSourceByPath`, pure, in `src/utils/dial-file-manager.ts`) picks the instance and delegates to that instance's own handler: `onPathChange`, `onUploadFiles` (destination folder), `onCreateFolder` / `onCreateFolderValidate` (parent), `onRenameValidate` and `onMoveToFiles` / `onDeleteFiles` (item `sourceUrl`s), `onDownloadFiles` (files grouped by source, one call per source). A move or copy whose destination source differs from its items' source is refused through the existing notification callback and nothing is sent. Permissions, columns (Author for Shared), `uploadEnabled`, `isNewButtonDisabled` and tooltips come from the instance owning the current folder; at All's top level, when no folder is open, the Add menu is disabled (`addDisabledAtAllRoot`). Busy flags (`isDeleting`, `isRenaming`, ...) are OR-ed across instances and the upload batch is the one non-null instance batch. Loading = any enabled instance loading; retry retries all.
   Instances keep per-tab caches, so switching tabs no longer refetches, and a change made under All is visible in the source tab because both read the same instance.
   Alternatives: (a) a merged cache inside the hook - rejected above; (b) browse-only All - rejected, the requirement is that All items behave like the tabs; (c) allow cross-source move - rejected, it would need a move across buckets, which the files API does not offer as one operation.
   Ids are untouched: `DialFile.id` is the DIAL Core path for every instance, `filesByPath` indexes the concatenated items by `path` and `id`, and `handleAttach` keeps working (`expandFolderFileIds` reads the folder's own `bucket`/`id`).

6. **No bulk-actions bar.** The library renders the floating bar only when `bulkActionsToolbarOptions` is passed (`FileManager.tsx:1318`), so the modal no longer passes it. Row-level actions (context menu) are untouched.

7. **Selection lifecycle unchanged.** Selection still resets on tab change and prefills once from `initialFileIds` for the initial My files tree; ids not resolved by the tree are kept on confirm (existing `handleAttach`).

8. **i18n (`common`, `DialFileManagerI18nKeys` in `src/constants/i18n.ts`).** Add `AddTitle` (`dialFileManager.addTitle`), `Add` (`dialFileManager.add`), `SearchPlaceholder` (`dialFileManager.searchPlaceholder`, "Search in {{folder}}..."), `TabAll` (`dialFileManager.tab.all`), `TabsAriaLabel`, `addDisabledAtAllRoot` (tooltip). Change `dialFileManager.tab.shared` to "Shared". Remove `Title`, `Attach` (confirm label now `Add`) and `FoldersPanelTitle` once unused. `CommonI18nKeys.Attach` stays for the conflict popup's confirm label.

9. **RTL and accessibility.** No new physical classes; the popup, tabs, search and grid direction come from `Popup` and the library. The chip row is named via `tabsAriaLabel`; checkbox and search names come from the kit/library defaults, verified in the tests below.

10. **Memoisation.** `FileManagerModal` stays `memo`; the option objects stay in `useMemo`; the composed All view is memoised on the three instances' items, and `onPathChange` routing uses `useCallback`.

## Risks / Trade-offs

- [Three listings hit chat-api when All is opened] → instances are enabled lazily, each root lists one folder; same endpoints and sizes as the tabs today.
- [Search only covers loaded folders, so a file in an unvisited folder is not found] → documented in the spec wording and `docs/TECH_DEBT.md`; the Search-in-folder placeholder names the scope.
- [Checkbox cause may sit in the library/kit] → task 2.1 stops and reports instead of patching around it.
- [Routing mistakes would send an operation to the wrong bucket] → the router is a pure function covered by unit tests, and every routed handler gets a modal test per source.
- [Mixed-source download/delete runs several calls] → processed per source; a failure in one source reports through the existing notification and does not hide the others.
- [`treeOptions.header: ''` relies on the library treating empty string as no heading] → asserted by a modal test and re-checked in the apply step.
- [Existing `use-dial-file-manager` tests assume tab switching reloads] → keep that path working when `activeTab` changes and `isEnabled` is not set.

## Migration Plan

UI-only; no stored data changes. Rollback by reverting the commit. After merge, archive into `application_knowledge-base`.

## Open Questions

- Cross-source move/copy under All is refused for now; confirm with product whether it is ever wanted.
