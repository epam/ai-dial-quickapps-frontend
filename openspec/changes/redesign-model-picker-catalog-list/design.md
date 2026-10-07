## Context

- `src/components/Orchestrator/ModelField.tsx` renders the Default model block **and** the whole picker: `groupModelsByEntity` (`:55`), `ModelCard` (`:94`), tabs, search, `VirtualCardGrid`, loading/error/empty states, inside a 1.0 `DialPopup` (`:395`). Selecting a card calls `onChange` and closes.
- The DIAL chat's skill/model pickers render `@epam/ai-dial-catalog` in selector mode. The lib is published (`development` tag `1.2.0-dev.303`), props-only (no store/context), and exports `ListView`, `Filter`, `Toolbar`, `CatalogItem`, `CatalogSortKey`, `sortCatalogItems`, `filterCatalogItems`, `getTopicOptions` (the last four also from the headless `@epam/ai-dial-catalog/mapping` entry).
- Peers: `react ^19.2.8`, `@epam/ai-dial-ui-kit ^0.15.0-dev.39` (we have `^0.15.0-dev.41` ✔), `@epam/ai-dial-chat-shared` (exact same version). chat-shared's peers: `ag-grid-community ^35.3.0`, `@epam/ai-dial-react-file-manager ^0.3.0-dev.25` (we have it ✔).
- Scope/folder for an entity id already exists: `getEntityScopeInfo(id, userBucket)` in `src/utils/entity-scope.ts`, used by `src/components/common/EntityScopeLine/EntityScopeLine.tsx:31`.
- `DataContext` provides `modelsWithFavorites`, `userBucket`, `status`, `error`, `refreshAll`.

## Goals / Non-Goals

**Goals:** visual parity with the chat catalog list for models; single selection confirmed by Add; sort + From filter; extract the picker from `ModelField.tsx`.

**Non-Goals:** see proposal (no checkboxes, favorites, details panel, grid view, publish actions).

## Decisions

### D1. Compose `ListView` + `Filter` with our own heading/search/sort, not `Toolbar` or `Catalog`

- `Catalog` drags in the details panel, favorites strip and publish flow and owns selection/close — too much and the wrong interaction.
- `Toolbar` requires `viewMode` + `onViewModeChange` and always renders the grid/list `SegmentedControl`; a dead toggle is worse than a custom row.
- We render: heading (`dial-body-semi-text` title + `dial-tiny-semi-text` count, same classes as `Toolbar`'s `TitleRow` defaults), ui-kit `Search`, catalog `Filter`, and a sort menu built from ui-kit `ButtonDropdown` + `MenuItemMark` like `TitleRow` does. Confirm prop signatures via ui-kit MCP during implementation.
- **Follow-up (upstream ask):** a `Toolbar` prop to hide the view toggle (e.g. `isViewToggleHidden`), after which our heading row can be replaced by `Toolbar`.

### D2. Pure mapping util `src/utils/map-model-to-catalog-item.ts`

`mapModelToCatalogItem(model, { language, userBucket, scopeLabels }) => CatalogItem`:

| `CatalogItem` | from `DialModel` |
| --- | --- |
| `id` | `id` (full id incl. version — one row per version) |
| `type` | `CatalogEntityType.Model` |
| `name` | `getLocalizedText(name, language, id)` |
| `version` | `version ?? ''` |
| `iconUrl` | `resolveIconUrl(iconUrl)` when set |
| `description` | `description ?? ''` |
| `topics` | `topics ?? []` |
| `updatedAt` | `getUpdatedAtTimestamp(updatedAt)` or omitted when 0 |
| `folder` | `[scopeLabel, ...folderPath]` from `getEntityScopeInfo`; `[]` when it returns `null` |
| `isMyApp` | scope is `ResourceScope.Personal` |
| `lastUsed` | `''` (required by the type, not shown in list) |

Scope labels are passed in already translated so the util stays i18n-free and testable.

### D3. Search / filter / sort with the lib's headless helpers

Rows = `sortCatalogItems(filterByMy(filterByTopics(searchFilter(items))), sortKey)`. Use the exported `filterCatalogItems`/`sortCatalogItems`/`getTopicOptions` from `@epam/ai-dial-catalog/mapping`; if `filterByTopics`/`filterByMyApp` aren't exported, implement the two one-liners in the same util file (`src/utils/map-model-to-catalog-item.ts` is model-specific; generic catalog filters go in `src/utils/filter-catalog-items.ts`). Default sort `CatalogSortKey.RecentlyUpdated`. "Newest" uses `createdAt`, which models don't carry → it falls back to the lib's order; acceptable, noted in Risks.

### D4. Selection state lives in `ModelCatalogModal`

```
interface ModelCatalogModalProps {
  isOpen: boolean;
  value: string;            // current form value, pre-highlight
  onConfirm: (modelId: string) => void;
  onClose: () => void;
}
```

- `selectedId` state initialised from `value` each time `isOpen` turns true (key the inner body on open, so all local state — query, filters, sort, selection — resets for free).
- Row click → `setSelectedId(item.id)` via `ListView.onItemClick`; `selectedItemId={selectedId}` gives the catalog's selected styling.
- **Add** (`PrimaryButton`) → `onConfirm(selectedId)`; disabled when `selectedId` is not a selectable model id, or status is not ready. **Cancel** (`NeutralButton`/`GhostButton`, check ui-kit) and popup close → `onClose()`.
- `ModelField` keeps `isOpen` and wires `onConfirm={(id) => { onChange(id); setIsOpen(false); }}`. All derived arrays and handlers wrapped in `useMemo`/`useCallback` (ListView is ag-grid-backed; new `items` identity re-renders rows).

### D5. Popup: ui-kit 2.0 `Popup` with `footer`

`DialPopup` is flagged 1.0/superseded. Use `Popup` (`PopupSize.Lg`, as the chat's `SkillCatalogModal`) with `footer`. Body height fixed (`h-[70vh]` today) so ag-grid has a sized container. Confirm `Popup` props via `getEntityDetails("component","Popup")`.

### D6. Keyboard selection

`ListView` wires only `onCellClicked`. Enter/Space on a focused row is required by the spec:
1. Preferred: ask upstream for `onItemKeyDown` / Enter-to-activate in `ListView` (it builds grid options internally).
2. Until then: an `onKeyDown` handler on the list wrapper — on Enter/Space, read the focused row's `row-id` from `event.target.closest('[row-id]')` and select it. Keep it in a small hook `src/hooks/useGridRowKeyboardSelect.ts` with a unit test.

### D7. Styles and dependencies

- `npm i @epam/ai-dial-catalog@<dev> @epam/ai-dial-chat-shared@<same> ag-grid-community@^35.3.0`, pinned to the same dev version (chat-shared peer is exact).
- Import `@epam/ai-dial-chat-shared/styles.css` and `@epam/ai-dial-catalog/styles.css` once in `src/main.tsx` after the ui-kit styles (the list renders chat-shared's icon and type label). The chat app builds these libs from source, so it never imports their dist stylesheets; the publish-panel CSS is not needed because the picker renders no publish flow.
- Theme variables (`--bg-layer-raised`, `--stroke-*`, `dial-*` typography) already come from ui-kit theming here.
- `ModelCatalogModal` is `React.lazy`-loaded and mounted only while open. Measured: eager import grew the main chunk by 484 kB (150 kB gzip); lazy keeps it at baseline and moves the picker into a 131 kB (46 kB gzip) chunk loaded on first **Change**.
- The catalog's `react ^19.2.8` peer moved `react` to 19.3; `react-dom` is bumped with it to stay in lockstep.

### D8. i18n (`quickAppEditor`)

New keys in `src/constants/i18n.ts` (`QuickAppEditorI18nKeys`) and `src/i18n/locales/quick-app-editor.json`: `ModelsCatalog` ("Models catalog"), `SearchModels` ("Search models…"), `SortLabel` ("Sort"), `SortRecentlyUpdated` ("Recently updated"), `SortNewest` ("Newest"), `SortNameAZ` ("Name A-Z"), `FilterFrom` ("From"), `FilterMy` ("My"), `FilterTopics` ("Topics"), `ChangeModel` ("Change model", the dialog title). Reuse `common.Cancel`, `common.Add`, `common.ClearSearch`, and existing `LoadingModels`, `FailedToLoadModels`, `Retry`, `NoResultsFound`, `NotAvailable`. Pass them to `ListView`/`Filter` via their label props (`ariaLabel`, `emptyStateTitle`, `myAppsLabel`, `topicsLabel`, `fromLabel`). Only `en` locale files exist today.

### D9. RTL

ag-grid does not follow `dir` by itself and `ListView` sets no `enableRtl`. Check in `ar`: if columns don't flip, pass through an upstream `enableRtl` (follow-up ask) or verify ui-kit `Grid` reads `document.dir`. Our own header/footer use flex + logical utilities (`ms-auto`, `gap-*`, `justify-end`); no icon mirrored.

## Risks / Trade-offs

- [Bundle size: ag-grid + catalog + chat-shared (markdown/katex deps)] → measure; lazy-load the picker (D7).
- [Exact-version coupling: chat-shared peer is pinned to the catalog's version, ui-kit range must keep matching] → pin both together; bump in one PR.
- [Type label ("MODEL") comes from chat-shared `EntityTypeLabel`, possibly not localised] → accept for parity; upstream ask for a label prop if a non-English locale needs it.
- [No RTL in `ListView`] → D9.
- [No keyboard activation in `ListView`] → D6.
- ["Newest" without `createdAt` is a no-op-ish order] → keep for parity; document.
- [ag-grid needs a sized container; jsdom has no layout] → tests mock `ListView` to a simple list (as `ModelField.test.tsx` already mocks `VirtualCardGrid`), and test the mapping/filter utils directly.
- [Removing tabs loses quick access to favorites] → product decision (Non-goal); the "My" filter covers personal models.

## Migration Plan

UI-only; no data or API migration. Rollback = revert the commit and remove the three dependencies + CSS import.

## Open Questions

- ~~Should the picker header title be "Select model" or "Change model"?~~ Decided in review: "Change model" (new key `ChangeModel`; `SelectModel` stays for the card's empty value).
- Should "Add" read "Select"/"Apply" for a single-value field? Assumed "Add" per design.
