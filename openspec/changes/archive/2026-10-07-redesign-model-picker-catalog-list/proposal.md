## Why

The Default model picker (opened by **Change**) is a 3-column grid of large cards with Favorites/Catalog tabs and an inline version dropdown per card. The DIAL chat now presents entity pickers (e.g. the skills catalog modal) as a compact catalog **list**: a title with count, search, a "From" filter, a sort menu, and a table with Name / Type / Folder / Tags columns. The editor should present models the same way so users see one consistent picker across DIAL, and the list scans faster than cards when there are many models.

## Problem

- The current picker (`src/components/Orchestrator/ModelField.tsx:194-450`, `ModelCard` at `:85`) looks and behaves differently from the chat catalog pickers.
- It has no sort and no topic filter; the only narrowing is name search and the Favorites tab.
- Selecting a card commits immediately — there is no way to look, compare, and confirm.
- The picker is ~250 lines inside `ModelField.tsx` (tracked in `docs/TECH_DEBT.md` "Extract the model picker popup").

## Solution

Replace the picker popup content with the published `@epam/ai-dial-catalog` list view, configured for models and **without checkboxes** (single selection):

- Header: "Models catalog" title + model count, search, the catalog's **From** filter (topics + "My"), and a **sort** menu (Recently updated — default, Newest, Name A-Z).
- Body: the catalog `ListView` with columns **Name** (icon, name, version), **Type**, **Folder** (scope + folder path), **Tags** (topics). Each model *version* is its own row.
- Clicking a row highlights it (the catalog's single-select styling). The footer has **Cancel** and **Add**: **Add** sets the `model` form value and closes; **Cancel**, ×, Escape, or outside click close without changing the value. The current value is pre-highlighted on open.
- Favorites/Catalog tabs and the per-card version dropdown are removed.
- The picker moves into its own component, `src/components/Orchestrator/ModelCatalogModal/ModelCatalogModal.tsx`.

## Alternatives considered

| Option | Correctness / parity | Delivery risk | Bundle / deps | Rollback |
| --- | --- | --- | --- | --- |
| **A. `@epam/ai-dial-catalog` `ListView` + `Filter` + own header (picked)** | Same component the chat uses → visual parity for free, upstream fixes flow in | Low; lib is props-only (no store/context) | + catalog, chat-shared, publish-panel, ag-grid (ag-grid already a ui-kit `Grid` dependency) | Revert commit + drop deps |
| B. Catalog `Toolbar` as the header | Same as A | `Toolbar` always renders a grid/list toggle (`viewMode`/`onViewModeChange` required, no hide prop) → a dead control in our modal | Same as A | Same |
| C. Rebuild with ui-kit `Grid`/`Search`/`ButtonDropdown` | Must re-implement and keep in sync with chat by hand | Medium; more code, drift | No new packages | Revert commit |
| D. Keep the card grid, only add sort/filter (baseline) | Doesn't meet the design | Lowest | None | — |

A was chosen by the product owner; B is rejected only because of the toggle (an upstream prop to hide it is a follow-up). C was rejected because parity with the chat is the goal.

## Non-goals

- Multi-select / checkboxes.
- Favorites tab, starring/unstarring from the picker, or a favorites strip.
- The catalog details panel, grid view, publish/share actions.
- Changing which deployments are selectable (still only `type: 'model'` with `features.tools`).
- Temperature / process-files controls.
- Changing the selected-model card on the block (defined by the archived `redesign-default-model-card` change).

## What Changes

- **BREAKING (UX only):** selecting a model now needs an explicit **Add**; clicking a row no longer commits and closes.
- Remove Favorites/Catalog tabs and the per-card version dropdown; every version is a separate row.
- Add sort (Recently updated / Newest / Name A-Z) and the From filter (topics, "My").
- Add a footer with **Cancel** / **Add**; **Add** is disabled while no row is highlighted.
- New deps: `@epam/ai-dial-catalog`, `@epam/ai-dial-chat-shared` (its peer), `ag-grid-community` (chat-shared peer) and the catalog stylesheet import.
- Extract the picker out of `ModelField.tsx` into `ModelCatalogModal`; map `DialModel` → `CatalogItem` in a new pure util.

## Capabilities

### New Capabilities

_None._ The picker belongs to the existing `orchestrator_model-selection` spec.

### Modified Capabilities

- `orchestrator_model-selection`: "Default model block" (Change scenario no longer mentions tabs/version cards and requires Add to commit) and "Picker offers only models" (tab wording dropped) are modified; new requirements are added for the picker layout, list columns, search/filter/sort, single selection with Cancel/Add, loading/empty/error states, keyboard/ARIA, and RTL.

## Acceptance criteria

- Opening **Change** shows a popup titled "Change model" with "Models catalog <n>", search, From filter, sort menu, and a list with Name / Type / Folder / Tags columns, no checkboxes, no tabs.
- Only tool-supporting models appear, one row per version, sorted by Recently updated by default.
- Search, From filter, and sort narrow/reorder the rows; the count reflects the filtered rows.
- Clicking a row highlights it; **Add** sets the form value and closes; Cancel/×/Escape/outside click discard.
- Loading, error (with Retry) and empty / no-results states render.
- `npm run lint`, `npm run typecheck`, `npm test` pass; new util and component tests cover the above.

## Impact

- **Code:** `src/components/Orchestrator/ModelField.tsx` (popup removed, renders `ModelCatalogModal`), new `src/components/Orchestrator/ModelCatalogModal/ModelCatalogModal.tsx` + tests, new `src/utils/map-model-to-catalog-item.ts` + tests, `src/main.tsx` (catalog CSS import), `src/components/Orchestrator/tests/ModelField.test.tsx` (picker assertions move). `ModelCard`, and the `VirtualCardGrid` usage here, are removed; `VirtualCardGrid`, `FavoriteStarButton`, `TopicsLine` stay if other callers use them (checked during implementation).
- **Dependencies:** `package.json` gains `@epam/ai-dial-catalog`, `@epam/ai-dial-chat-shared` and `ag-grid-community` (version-aligned with the ui-kit `0.15.0-dev` line we use). Bundle size grows; the picker can be lazy-loaded if it matters (see design).
- **API / chat-api:** none. Models still come from `DataContext` (`deploymentsApi.listDeployments` in `src/utils/dialClient.ts`). No auth or host-integration change.
- **i18n:** new `quickAppEditor` strings — catalog title, sort label and options, filter labels ("From", "My", "Topics"), list column/aria labels, empty list title. "Cancel"/"Add" reuse `common`. Removed: tab labels if unused elsewhere.
- **RTL:** the list, header and footer must follow `dir`; catalog lib uses logical layout but must be checked in `ar`; no directional icons are added (folder, filter, chevron-down are symmetric or vertical).
- **Rollback:** non-breaking for data — the `model` form value and saved applications are unchanged. Revert the commit and remove the three dependencies.
