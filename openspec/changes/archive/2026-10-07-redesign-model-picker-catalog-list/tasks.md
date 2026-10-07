Slicing strategy: **risk-first, then vertical.** Slice 1 proves the new packages install, style and render inside our popup (the highest-risk part). Slice 2 is the end-to-end happy path: list rows, select a row, confirm with Add. Slices 3–5 then widen it with search/filter/sort, states, a11y/RTL, and cleanup. Each slice leaves the app working.

Conventions to follow: arrow-function exports, extensionless imports, `@/` alias, `{Component}Props` interfaces, boolean `is/has/can` prefixes, `onX`/`handleX`, no nested ternaries, logical Tailwind utilities (AGENTS.md, `.claude/rules/all-ts.md`, `.claude/rules/rtl.md`). Confirm ui-kit props with `getEntityDetails` before use.

## 1. Dependencies and a rendering spike (risk-first)

- [x] 1.1 Add `@epam/ai-dial-catalog`, `@epam/ai-dial-chat-shared` (same exact dev version, currently `1.2.0-dev.303`) and `ag-grid-community@^35.3.0` to `package.json` dependencies; install and make sure there are no peer-dependency conflicts with `@epam/ai-dial-ui-kit` and `@epam/ai-dial-react-file-manager`.
- [x] 1.2 Import `@epam/ai-dial-catalog/styles.css` once in `src/main.tsx`, after the ui-kit styles.
- [x] 1.3 Record the bundle size from `npm run build` before and after 1.1–1.2, for the lazy-load decision in 5.3.
  - Verification: `npm run build`, `npm run typecheck`, `npm run lint`.

## 2. Vertical slice: list models, select a row, confirm with Add

- [x] 2.1 Create `src/utils/map-model-to-catalog-item.ts` with `mapModelToCatalogItem` (field table in design D2), using `getEntityScopeInfo`, `getLocalizedText`, `resolveIconUrl` and `getUpdatedAtTimestamp`. Scope labels are passed in already translated.
- [x] 2.2 Unit tests in `src/utils/tests/map-model-to-catalog-item.test.ts`. Cover: name localisation and the id fallback; a version and a missing version; folder for Organization, a public sub-folder, Personal (`isMyApp: true`) and unknown scope (`[]`); topics defaulting to `[]`; and `updatedAt` conversion.
  - Verification: `npx vitest run src/utils/tests/map-model-to-catalog-item.test.ts`.
- [x] 2.3 Create `src/components/Orchestrator/ModelCatalogModal/ModelCatalogModal.tsx` with `ModelCatalogModalProps { isOpen; value; onConfirm; onClose }` (design D4).
  - Use the ui-kit 2.0 `Popup` (`PopupSize.Lg`), titled `ChangeModel`, with header/footer dividers and a fixed-height body.
  - Inside: the catalog `ListView` (`type` Model, `isReadonly` so there is no favorites column, `columnVisibility.folder` always true, `selectedItemId`, `onItemClick`, `ariaLabel`).
  - Footer: Cancel and Add.
  - Selectable models are filtered exactly as today (`type === 'model'`, `features.tools`, `!isHiddenDialFolderId`). Rows and handlers are memoised; inner state resets on each open.
- [x] 2.4 In `src/components/Orchestrator/ModelField.tsx`, replace the inline `DialPopup` body, `ModelCard`, `groupModelsByEntity`, tabs and `VirtualCardGrid` usage with `<ModelCatalogModal>`. `onConfirm` calls `onChange(id)` and closes the picker. Leave the Default model block and card unchanged.
- [x] 2.5 Add the `quickAppEditor` keys `ModelsCatalog`, `SearchModels`, `SortLabel`, `SortRecentlyUpdated`, `SortNewest`, `SortNameAZ`, `FilterFrom`, `FilterMy` and `FilterTopics`. They go in `src/constants/i18n.ts` (`QuickAppEditorI18nKeys`) and `src/i18n/locales/quick-app-editor.json`, the only locale. Values are in design D8.
- [x] 2.6 Component tests in `src/components/Orchestrator/ModelCatalogModal/tests/ModelCatalogModal.test.tsx`, with `ListView` mocked to a plain list of row buttons that pass `selectedItemId`. Cover:
  - only tool-supporting models are listed, one row per version;
  - the current value is pre-selected and Add is enabled;
  - clicking a row selects it without calling `onConfirm`;
  - Add calls `onConfirm` with the full versioned id;
  - Cancel and close call `onClose` and never `onConfirm`;
  - Add is disabled when nothing selectable is selected;
  - state resets on reopen.
- [x] 2.7 Update `src/components/Orchestrator/tests/ModelField.test.tsx`: remove the assertions about tabs, cards and `VirtualCardGrid`, and assert that Change opens the picker and that confirming in it updates the value.
  - Verification: `npx vitest run src/components/Orchestrator`, `npm run lint`, `npm run typecheck`, then the full `npm test` once the slice is done.

## 3. Search, From filter and sort

- [x] 3.1 Add the heading row ("Models catalog" + filtered count; sort menu at the end side) and the search row (ui-kit `Search` + catalog `Filter`) to `ModelCatalogModal` (design D1). The topic options come from `getTopicOptions`; "My" filters on `isMyApp`. Pass the labels from 2.5 into `Filter`.
- [x] 3.2 Build the sort menu from ui-kit `ButtonDropdown` + `MenuItemMark` with the options `CatalogSortKey.RecentlyUpdated` (default), `Newest` and `NameAZ`. Its accessible name starts with `SortLabel`.
- [x] 3.3 Compose search → topics → My → sort, memoised (design D3). Use the exported `@epam/ai-dial-catalog/mapping` helpers. Write any missing generic helper in `src/utils/filter-catalog-items.ts` with tests in `src/utils/tests/filter-catalog-items.test.ts`.
- [x] 3.4 Extend `ModelCatalogModal.test.tsx`. Cover:
  - search narrows the rows and updates the count;
  - the clear button restores them;
  - the topic filter and "My" narrow the rows;
  - sort reorders (default Recently updated, rows without `updatedAt` last; Name A-Z);
  - a selected row hidden by search still confirms on Add.
  - Verification: `npx vitest run src/components/Orchestrator/ModelCatalogModal src/utils/tests`, `npm run lint`, `npm run typecheck`.

## 4. States, keyboard and RTL

- [x] 4.1 Add the loading, error and empty states to the `ModelCatalogModal` list area: a spinner labelled `LoadingModels`; `FailedToLoadModels` with Retry calling `refreshAll`; `NoResultsFound` when search or filter is active; `NotAvailable` otherwise. Header and footer stay visible, and Add stays disabled while loading or on error.
- [x] 4.2 Keyboard selection (design D6): create `src/hooks/useGridRowKeyboardSelect.ts` (Enter/Space on a focused `[row-id]` element calls back with the id) and use it on the list wrapper. Unit-test it in `src/hooks/tests/useGridRowKeyboardSelect.test.tsx`.
- [x] 4.3 RTL: use logical utilities only in the `ModelCatalogModal` heading, search row and footer (`ms-*`/`me-*`, `ps-*`/`pe-*`, `text-start`, `justify-end`), and mirror no icons. If `ListView` columns don't follow `dir="rtl"`, record the upstream ask (task 6.2) instead of patching ag-grid locally.
- [x] 4.4 Extend `ModelCatalogModal.test.tsx` with the state cases (loading, error + Retry, no results, not available) and with Enter selecting a focused row.
  - Verification: `npx vitest run src/components/Orchestrator/ModelCatalogModal src/hooks/tests/useGridRowKeyboardSelect.test.tsx`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 5. Cleanup and docs

- [x] 5.1 Remove the now-unused imports from `ModelField.tsx` and the `VERSION_SELECT_CLASS`/`ModelGroup` code. Keep `VirtualCardGrid`, `FavoriteStarButton`, `TopicsLine` and the `MyFavorites`/`CatalogTab`/`NoFavoritesYet` keys, because `SkillsModal` and `AgentAndToolsetModal` still use them. Remove `VersionPrefix` and `NoResultsFoundInWorkspace` only if nothing else references them.
- [x] 5.2 Update `docs/TECH_DEBT.md`:
  - mark "Extract the model picker popup out of `ModelField.tsx`" done;
  - under "Orchestrator / model selection", note that the picker popup is now specified;
  - list the follow-ups from section 6.
- [x] 5.3 Based on the 1.3 measurement: if the build grows noticeably, wrap `ModelCatalogModal` in `React.lazy` + `Suspense` (with the spinner as fallback) in `ModelField.tsx`. Otherwise leave it eager and note the numbers in the PR.
  - Verification: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`.
- [x] 5.4 Slim the Default model block: rename `src/components/Orchestrator/ModelField.tsx` to `src/components/Orchestrator/DefaultModelBlock/DefaultModelBlock.tsx` (tests in its `tests/` folder), move the card into `src/components/Orchestrator/SelectedModelCard/SelectedModelCard.tsx` with the kit's `ErrorText` for the validation message, read the selected model from `DataContext.modelsMap`, and drop `ModelCatalogModal's` `isOpen` (it is mounted only while open).
  - Verification: `npx vitest run src/components/Orchestrator`, `npm run lint`, `npm run typecheck`.
- [x] 5.5 Move the rest of the Configuration column to 2.0, as requested in review: Temperature and Process files become caption `SectionRow`s (like Default model) instead of the 1.0 `DialFormItem`; the temperature control is the kit's 2.0 `Slider` (replaces `src/components/common/Temperature.tsx`, now deleted) with translated scale labels (`quickAppEditor` keys `TemperaturePrecise`/`TemperatureNeutral`/`TemperatureCreative`) and description (`TemperatureDescription`). The picker's empty/error states use the 2.0 `NoDataContent` and `Button`; icons take `DIAL_ICON_SIZE`/`DIAL_KIT_ICON_STROKE`. Values and conditional visibility are unchanged.
  - Verification: `npx vitest run src/components/Orchestrator`, `npm run lint`, `npm run typecheck`.
- [x] 5.6 Drop the `src/components/common/ToggleSwitch` wrapper and its `warning` prop (the Conversation starters "populated input can't be edited" warning and `quickAppEditor` key `PayAttentionTheUserWontBeAbleToEdit` are removed, as requested in review); every switch uses the kit's `Switch` directly, with the read-only hint moved from a hover tooltip into the label's info button (`labelProps.caption`). The temperature slider shows no read-only hint for now (to be added with the slider update); `SectionRow` is unchanged.
  - Verification: `npx vitest run src/components`, `npm run lint`, `npm run typecheck`.

## 6. Follow-ups (record only, do not implement here)

- [x] 6.1 Upstream ask to ai-dial-chat `libs/catalog`: a `Toolbar` prop to hide the grid/list toggle, so the picker can use `Toolbar` instead of a custom heading row.
- [x] 6.2 Upstream ask: Enter/Space row activation (`onItemKeyDown` or similar) and `enableRtl` support in `ListView`. Once available, drop `useGridRowKeyboardSelect`.
- [x] 6.3 Upstream ask: a label override for chat-shared `EntityTypeLabel`, so the Type cell can be localised.
