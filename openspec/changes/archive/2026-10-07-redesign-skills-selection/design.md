## Context

**Current code path.** `AddOnsSection.tsx:48` renders `AgentSkillsFormSection`. That component owns `isSkillsModalOpen` and renders `AddOnRow` around `AgentSkillsField`. `AgentSkillsField` is a pure proxy to `common/SkillsSelector/SkillsSelector.tsx`, which renders:

- the chip box (`SkillChip`: tooltip, closable `DialTag`),
- the card-grid `SkillsModal` (Favorites/Catalog tabs, a "Selected" strip, `VirtualCardGrid`).

The `agentSkills: string[]` form value is owned by `useQuickApp2Form` and flows in via `QuickApp2Form.tsx:212-214`. The save mapping is `src/form/quickApp2Form.ts`, and `dialClient.ts:220-262` decodes and re-encodes skill URLs. Neither changes.

**Data.** `DataContext` loads skills once with `fetchDialSkills()` (`dialClient.ts:446-451` → `skillsApi.listCatalogSkills()`, `GET /api/v1/skills/catalog`) and exposes `skills`, `skillsMap`, `userBucket`, `status`, `error` and `refreshAll`. `mapCoreToDialSkill` (`dialClient.ts:420-443`) keeps `url → id`, `name`, `description`, `author`, `updatedAt`, `isMy`, `canEdit` and `sharedWithMe`. It drops `bucket`, `path` and `parentPath`. `SkillMetadataItemDto` has no version and no tags. The chat's own mapper says so too ("Skills are unversioned — the metadata exposes no version field", ai-dial-chat `libs/chat-hooks/src/catalog/map-skill-to-catalog-item.ts:96`).

**Reference pattern.** `ModelCatalogModal.tsx` is the model picker: the kit `Popup` + `ItemHeader` heading + sort `ButtonDropdown` + `Search` + catalog `Filter` + catalog `ListView`. It is lazy-loaded from `DefaultModelBlock.tsx:19-24` because the catalog bundle pulls in ag-grid. `filterCatalogItemsByQuery` (`src/utils/filter-catalog-items.ts`) and the `mapModelToCatalogItem` folder logic (scope label + `getEntityScopeInfo`, which already treats `skills/` as a bucketed root) are reusable as is.

**Catalog capabilities, installed `@epam/ai-dial-catalog` 1.2.0-dev.303:**

- `ListView` marks a single `selectedItemId`, with no checkbox column (`models/list-props.d.ts`).
- Its Name cell already renders `DeploymentIcon` with an initials fallback (`components/ListView/Renders/NameCellRenderer.tsx`).
- `ContentTab` is exported and renders a Markdown body plus a description line, with an optional file tree.

**User decisions:**

- Delete = detach from the app.
- Version and tags are shown when present.
- Multi-select goes upstream into catalog `ListView`. The ui-kit `Grid` was considered and declined, so the list stays identical to the models list.
- Overview = listing metadata.

## Goals / Non-Goals

**Goals:**

- A Skills row list (avatar, name, optional version) whose items open a details popup.
- A details popup with Details (rendered `SKILL.md`) and Overview (metadata), plus Delete (detach) and Close.
- An Add skill popup on the catalog list with multi-select, search, From filter and sort, committing on Add.
- Delete the `SkillsSelector` / `AgentSkillsField` proxy layer.

**Non-Goals:**

- Any skill resource mutation, favourites, or a file tree inside a skill.
- Changing `agentSkills`, the save mapping, or the `DataContext` loading strategy.
- Implementing the catalog multi-select inside this repo.

## Decisions

### D1. Component layout

New folder `src/components/Skills/`, one PascalCase folder per component, with tests in `tests/`:

- **`SkillsList/SkillsList.tsx` (`memo`).**
  - Props: `value: string[]`, `isReadonly: boolean`, `onRemove(id: string)`.
  - Renders a `<ul>` of `SkillListItem` buttons.
  - Owns `openSkillId: string | null` and mounts `SkillDetailsPopup` lazily while it is set.
  - Reads `skillsMap` from `DataContext`.
  - Keeps a ref per item, so focus returns to the opener on close. The kit `Popup` restores focus to the previously focused element; the ref is the fallback if the item was removed.
- **`SkillsList/SkillListItem.tsx`.** A `group` row: the details button (`DeploymentIcon` size 36 with `initialsName`, name, and the optional version via `ItemHeader` `postfix`), then, in an editable app, a ui-kit `GhostIconButton` with `IconTrash`. The trash button is a sibling, not a child, of the details button, because buttons cannot nest. It is `opacity-0` until `group-hover` / `group-focus-within`, so it stays keyboard reachable. Removal goes through the same `onRemove` + refocus path as the popup's Delete. This matches the catalog Name cell, so the row and the list look the same. The whole item is a button. Use a ui-kit clickable list-item or button-base component if the MCP search finds one that can hold this content. Otherwise use a native `<button type="button">`, with a comment explaining why (`.claude/rules/all-tsx.md` "Component-First Development").
- **`SkillDetailsPopup/SkillDetailsPopup.tsx`.**
  - Kit `Popup` (`PopupSize.Lg`). The header node is avatar + caption + name, with `ariaLabel` = name.
  - Kit 2.0 `Tabs` with local `activeTab`.
  - The footer uses `additionalButtons` (Delete: red danger solid button with a leading `IconTrash`) with `additionalButtonsOnLeft`, and `mainButtons` (Close, primary link appearance). Delete is omitted when `isReadonly`.
  - Body: `SkillDetailsTab` or `SkillOverviewTab`.
- **`SkillDetailsPopup/SkillDetailsTab.tsx`.** Uses `useSkillManifest` and renders `ContentTab` (`content`, `description`) or the loading, error and unavailable states.
- **`SkillDetailsPopup/SkillOverviewTab.tsx`.** A `<dl>` of label/value rows built by the pure `getSkillOverviewRows` (in `src/utils/map-skill-to-catalog-item.ts`, next to the folder logic it shares).
- **`AddSkillsModal/AddSkillsModal.tsx`.** The model picker's layout with multi-select. It owns `search`, `topics`, `isMyOnly`, `sortKey` and `checkedIds: string[]` (an array, so the check order is kept for D4).

`AgentSkillsFormSection.tsx` keeps owning `isAddModalOpen` and the `AddOnRow`. It renders `<SkillsList>` as the row content and lazily mounts `<AddSkillsModal>` while open. `common/SkillsSelector/**` and `AgentSkills/AgentSkillsField.tsx` are deleted.

_Alternative:_ keep `SkillsSelector` as the owner of both popups. Rejected: it is the proxy layer `docs/TECH_DEBT.md:16` asks to remove, and splitting the list and picker matches `DefaultModelBlock` / `ModelCatalogModal`.

### D2. Lazy loading

`AddSkillsModal` and `SkillDetailsPopup` both import from `@epam/ai-dial-catalog` (`ListView`, `Filter`, `ContentTab`). The package's index bundles ag-grid, so both are `React.lazy` + `Suspense fallback={null}`, exactly as in `DefaultModelBlock.tsx:19-24`. The editor's initial chunk then doesn't grow. `SkillListItem` imports only `@epam/ai-dial-chat-shared`, which is already in the main chunk.

### D3. Catalog mapping (`src/utils/map-skill-to-catalog-item.ts`)

`mapSkillToCatalogItem(skill: DialSkill, { userBucket, scopeLabels }): CatalogItem` is a pure function, mirroring `mapModelToCatalogItem`:

- `id`: the skill id.
- `type`: `CatalogEntityType.Skill`.
- `name`.
- `version`: `skill.version ?? ''`.
- `description`.
- `topics`: `skill.tags ?? []`.
- `updatedAt`.
- `folder`: `[scopeLabel, ...folderPath]`, or `[]` when unknown.
- `isMyApp`: `skill.isMy === true`, falling back to the personal scope.
- The other required `CatalogItem` fields get the neutral defaults `mapModelToCatalogItem` uses.

The scope/folder resolution is extracted from `map-model-to-catalog-item.ts` into a shared `getCatalogFolder(scopeInfo, scopeLabels)` in `src/utils/entity-scope.ts`. It takes resolved scope info rather than an id, because models resolve scope with their own configured-model fallback (`getModelScopeInfo`). Sharing it means the Folder column and the Overview "Folder" row can't disagree. That is the only edit to the model mapper, and it is behaviour-preserving.

`DialSkill` gains the optional `bucket`, `path`, `version` and `tags`. `mapCoreToDialSkill` copies `bucket` and `path`, and copies `version` and `tags` only when the DTO carries them (read defensively via `'version' in item`, since the generated type lacks them). When chat-api adds the fields, they appear with no code change here.

### D4. Selection semantics (Add skill popup)

- `checkedIds` starts as `[...agentSkills]`. Toggling on appends the id; toggling off removes it.
- On Add: `[...agentSkills.filter(id => checked.has(id) || !listedIds.has(id)), ...checkedIds.filter(id => !agentSkills.includes(id))]`.
  - This keeps today's "existing first, then newly added" order (`SkillsModal.tsx:136-140`).
  - It also keeps attached ids that have no row (spec "Attached skill not in the catalog").
- Select-all works on the currently listed rows only. If every listed row is checked, it unchecks them. Otherwise it appends the unchecked ones in list order.
- The selection is passed to `ListView` as `selectedItemIds={new Set(checkedIds)}` (memoised).
- Only the row checkbox, a row click and Space toggle. Enter on a row is left to the catalog's default.

### D5. Upstream `ListView` multi-select contract (ai-dial-chat `libs/catalog`)

Proposed additive props, so existing single-select callers are unaffected:

```ts
selectionMode?: CatalogSelectionMode;              // 'single' (default) | 'multiple'
selectedItemIds?: ReadonlySet<string>;             // multiple mode, controlled
onSelectionChange?: (ids: Set<string>) => void;    // multiple mode
selectRowAriaLabel?: (item: CatalogItem) => string;
selectAllAriaLabel?: string;
```

- **Multiple mode:** a pinned-start selection column with the ui-kit 2.0 `Checkbox`.
- **Header:** a select-all checkbox (checked / unchecked / `mixed`) that applies to the current `items`.
- **Rows:** a row click toggles the row. Space on a focused row toggles it. The single-select check mark and accent border are not drawn.

This repo consumes those props, and the Add skill slice (tasks §4) waits for the release.

_Alternative:_ ui-kit `Grid` with `GridSelectionMode.MULTIPLE`, which works today. Declined by product decision (see proposal).

### D6. Manifest fetch and parsing

- **Client.** `fetchSkillManifest(skill: DialSkill, signal?)` in `dialClient.ts` calls `skillsApi.downloadSkillFile({ bucket, path, filePath: SKILL_MANIFEST_FILE }, { signal })` and returns `await blob.text()`.
  - `bucket` and `path` come from `DialSkill.bucket` / `path`.
  - Fallback: split the id `skills/{bucket}/{...path}` and decode the segments.
  - `SKILL_MANIFEST_FILE = 'SKILL.md'` goes in `src/constants/skills.ts`.
- **Parsing.** `parseSkillManifest(text): { description?: string; body: string }` in `src/utils/parse-skill-manifest.ts`.
  - It strips a leading `---\n…\n---` block and reads `description:` from it. It handles a single-line scalar, a quoted scalar, and `>`/`|` folded blocks.
  - It does not pull in a YAML dependency. Only `description` is needed, and the chat's full parser lives in a private package.
  - On anything it can't parse, it returns the whole text as `body`.
- **Hook.** `useSkillManifest(skill: DialSkill | undefined)` in `src/hooks/use-skill-manifest.ts` returns `{ status: ManifestStatus, description, body, retry }`.
  - `ManifestStatus` is a string enum (`Idle`, `Loading`, `Ready`, `Error`) in `src/types/skill-manifest.ts`.
  - It fetches inside `useEffect` with an `AbortController` and a cancelled flag (per the config rules).
  - It refetches on `skill.id` or a retry nonce. It returns `Idle` without fetching when `skill` is undefined (the unavailable state).
- **Caching.** None: the popup is opened deliberately, and the content can change between opens.

_Alternative:_ `getSkillMetadata` / `listSkillFiles` first, to resolve the manifest path the way the chat does (`resolveSkillManifestFileId`). Rejected for now: `downloadSkillFile` with `filePath=SKILL.md` is the documented chat-api contract. If a Core version stores it under `files/`, the error state shows Retry and this becomes a follow-up (see Open questions).

### D7. Footer buttons

The kit `Popup` renders `ButtonProps` from data. Delete follows the design's button spec — `variant: ButtonVariant.Danger`, `appearance: ButtonAppearance.Solid`, the default standard size and `iconBefore: <IconTrash/>` and `additionalButtonsOnLeft`. Close uses `variant: Primary, appearance: Link`. Delete doesn't need a confirmation dialog: it only edits the unsaved form, so the change can be undone by not saving.

### D8. i18n

All strings use `quickAppEditor`, except the reused `common` `Add`, `Cancel`, `CloseDialog` and `ClearSearch`. The keys are added to `QuickAppEditorI18nKeys` in `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json`. `SkillDetails` and `SelectSkill` take a `{{name}}` interpolation. The Overview date uses `Intl.DateTimeFormat(language, { dateStyle: 'medium' })`.

### D9. RTL

- Row items: `flex items-center gap-2.5` and `text-start`.
- Popup header: `flex gap-3`.
- Overview rows: a `grid grid-cols-[auto_1fr] gap-x-6`.
- No physical `ml/mr/pl/pr/left/right`.
- The catalog list, `Popup` footer (`additionalButtonsOnLeft` = the logical start edge) and `Tabs` already follow `dir`.
- No icon is mirrored.

## Risks / Trade-offs

- [The upstream catalog release slips] → Slices 1–3 (row list, details popup, delete) ship on the current catalog version. The Add action keeps opening the old `SkillsModal` until slice 4 lands, so `SkillsModal` is deleted in slice 4, not slice 1.
- [Version and tags stay absent for a long time] → The layout degrades cleanly: no version text, an empty Tags column, and From with only "My". The gap is tracked in `docs/TECH_DEBT.md` as a chat-api ask.
- [`SKILL.md` stored under a different file path on some Core versions] → The error state with Retry is visible and the Overview still works. Follow-up: resolve the path via `listSkillFiles`, as the chat does.
- [Removing inline chip removal adds a click] → Accepted by the design. Bulk removal is available by unchecking in Add skill.
- [Large `SKILL.md`] → It is rendered once per open, in a scrollable popup body. There is no size cap in this change; the chat enforces `SKILL_MANIFEST_MAX_BYTES` and that can be mirrored if needed.
- [Two lazy chunks] → Both popups share the same `@epam/ai-dial-catalog` chunk that `ModelCatalogModal` already loads, so the extra download is small.

## Migration Plan

UI-only. No data migration: `agentSkills` and the saved `skills` config are unchanged. Deploy order:

1. Ship the catalog `ListView` multi-select upstream.
2. Bump `@epam/ai-dial-catalog` here.
3. Land slice 4.

Rollback: revert this change's commits and pin the previous catalog version.

## Open Questions

- Should the Details tab also list a skill's bundled files (as the chat's `ContentTab` file tree does)? Out of scope here, but cheap to add later with `listSkillFiles`.
- The exact chat-api field names for version and tags (`version`, `tags` assumed). Confirm them with the chat-api owners when the upstream ask is filed.
