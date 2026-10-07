Slicing strategy: **vertical, ordered around the upstream dependency.**

- Slices 2 and 3 (Skills row list, details popup with Delete) work end to end on the installed `@epam/ai-dial-catalog`. While they are in progress, the Add action keeps opening the old `SkillsModal`.
- Slice 4 (Add skill popup) is **blocked** until a catalog release with `ListView` multi-select is installed (design D5). Only slice 4 deletes the old modal.
- Every slice leaves `npm run lint`, `npm run typecheck` and `npm test` green.

Before starting, read `AGENTS.md`, `.claude/rules/all-ts.md`, `.claude/rules/all-tsx.md` and `.claude/rules/rtl.md`. Follow these conventions:

- extensionless code imports, the `@/` alias, arrow-function exports;
- string enums in `src/types/`, `is/has` boolean names, `on/handle` handler names;
- `mergeClasses` for conditional classes;
- `DIAL_ICON_SIZE` / `DIAL_KIT_ICON_STROKE` for icons.

Confirm kit props with the ui-kit MCP (`getEntityDetails`) before using `Popup`, `Tabs`, `ButtonProps`, `Spinner`, `NoDataContent` and `Checkbox`. Component tests go in a `tests/` subfolder and use role, label and text queries.

## 1. Contract: types, mapping, manifest parsing, client

- [x] 1.1 Extend `DialSkill` in `src/types/dial-entities.ts` with optional `bucket?: string`, `path?: string`, `version?: string` and `tags?: string[]`. Add `src/types/skill-manifest.ts` with the string enum `ManifestStatus { Idle = 'idle', Loading = 'loading', Ready = 'ready', Error = 'error' }` and the interface `SkillManifest { description?: string; body: string }`.
  - Verification: `npm run typecheck`.
- [x] 1.2 Add `src/constants/skills.ts` with `SKILL_MANIFEST_FILE = 'SKILL.md'`.
- [x] 1.3 In `src/utils/dialClient.ts`:
  - make `mapCoreToDialSkill` (`:420-443`) also copy `bucket` and `path`;
  - copy `version` and `tags` only when the DTO carries them (`'version' in item`, `Array.isArray(item.tags)`), as in design D3;
  - add `fetchSkillManifest = async (skill: DialSkill, signal?: AbortSignal): Promise<string>`. It calls `skillsApi.downloadSkillFile({ bucket, path, filePath: SKILL_MANIFEST_FILE }, { signal })` and returns the blob's text. `bucket`/`path` fall back to splitting the `skills/{bucket}/{...path}` id with decoded segments.
- [x] 1.4 Extract the scope + folder-path resolution from `src/utils/map-model-to-catalog-item.ts` into `getCatalogFolder(scopeInfo, scopeLabels): string[]` in `src/utils/entity-scope.ts`, and use it from the model mapper. It takes the already-resolved scope info because models resolve it with their own fallback (`getModelScopeInfo`). Behaviour must not change.
  - Verification: the existing model-mapper tests and `src/components/Orchestrator/ModelCatalogModal/tests/ModelCatalogModal.test.tsx` still pass.
- [x] 1.5 Create `src/utils/map-skill-to-catalog-item.ts` with the arrow-function exports below (design D3):
  - `mapSkillToCatalogItem(skill, { userBucket, scopeLabels }): CatalogItem`;
  - `getSkillOverviewRows(skill, { userBucket, scopeLabels, language, labels }): { label: string; value: string }[]`. It returns the Author, Folder (joined " / "), Updated (`Intl.DateTimeFormat(language, { dateStyle: 'medium' })`) and Version rows, and omits empty ones.
- [x] 1.6 Create `src/utils/parse-skill-manifest.ts` exporting `parseSkillManifest(text): SkillManifest` (design D6). It strips a leading frontmatter block, reads `description` (plain, quoted, and `>`/`|` folded), and returns the whole text as `body` when there is no frontmatter or it is malformed.
- [x] 1.7 Create `src/hooks/use-skill-manifest.ts` exporting `useSkillManifest(skill?: DialSkill): { status: ManifestStatus; manifest?: SkillManifest; retry: () => void }`.
  - It fetches in `useEffect` with an `AbortController` plus a cancelled flag, and refetches on `skill?.id` or a retry nonce.
  - With no skill it returns `Idle` and makes no request.
  - `retry` is wrapped in `useCallback`.
- [x] 1.8 Unit tests:
  - `src/utils/tests/map-skill-to-catalog-item.test.ts`:
    - `skills/public/web-search` → folder `['Organization']`;
    - `skills/public/research/x` → `['Organization', 'research']`;
    - a personal bucket → `isMyApp`;
    - an unknown bucket without a user bucket → `folder: []`;
    - version/tags pass-through and defaults;
    - overview rows omit empty values.
  - `getCatalogFolder` cases added to the existing `src/utils/tests/entity-scope.test.ts`.
  - `src/utils/tests/parse-skill-manifest.test.ts`: frontmatter stripped; plain, quoted and folded `description`; no frontmatter; unterminated frontmatter returned verbatim.
  - `src/hooks/tests/use-skill-manifest.test.tsx` (mock `fetchSkillManifest`):
    - Loading → Ready;
    - Error → `retry` → Ready;
    - no request when `skill` is undefined;
    - a stale response after a skill switch is ignored;
    - abort on unmount.
  - The `fetchSkillManifest` cases in `src/utils/tests/dialClient.test.ts` (create it if absent):
    - request params for `skills/public/research/user-research` → `bucket=public`, `path=research/user-research`, `filePath=SKILL.md`;
    - `mapCoreToDialSkill` keeps `bucket`/`path`.
  - Verification: `npx vitest run src/utils/tests/map-skill-to-catalog-item.test.ts src/utils/tests/parse-skill-manifest.test.ts src/hooks/tests/use-skill-manifest.test.tsx src/utils/tests/dialClient.test.ts`, `npm run lint`, `npm run typecheck`.

## 2. Vertical slice: attached skills list in the Skills row

Depends on 1.

- [x] 2.1 Add the `quickAppEditor` keys used by slices 2–3 to `QuickAppEditorI18nKeys` in `src/constants/i18n.ts` and to `src/i18n/locales/quick-app-editor.json` (English copy from the spec):
  - `SkillDetails` ("{{name}} details"), `SkillTypeLabel` ("Skill");
  - `SkillDetailsTab` ("Details"), `SkillOverviewTab` ("Overview");
  - `RemoveSkillFromApp` ("Delete");
  - `SkillAuthor`, `SkillFolder`, `SkillUpdated`, `SkillVersion`;
  - `LoadingSkillContent`, `FailedToLoadSkillContent`, `SkillUnavailable`.
  - This repo has a single locale file per namespace; add each key there.
- [x] 2.2 Create `src/components/Skills/SkillsList/SkillListItem.tsx` (props interface `SkillListItemProps`). It renders `DeploymentIcon` (size 36, `initialsName`) and `ItemHeader` (title + optional version `postfix`) inside one button. The accessible name is `SkillDetails` with `{ name }`, and the click handler is the `onClick` prop. Choose the button element per design D1 (ui-kit component first).
- [x] 2.3 Create `src/components/Skills/SkillsList/SkillsList.tsx` (`memo`, props `SkillsListProps { value: string[]; isReadonly: boolean; onRemove: (id: string) => void }`).
  - It renders a `<ul>` of `SkillListItem` in `value` order, from `useDataContext().skillsMap`. A missing skill falls back to `getEntityNameFromId`.
  - It owns `openSkillId` state; the popup itself is wired in 3.4.
- [x] 2.4 In `src/components/AgentSkills/AgentSkillsFormSection.tsx`:
  - render `<SkillsList value onRemove isReadonly />` as the `AddOnRow` child, instead of `AgentSkillsField`;
  - mount the existing `SkillsModal` (imported from `@/components/common/SkillsSelector/SkillsModal`) directly while `isSkillsModalOpen && !isReadonly`. Its confirm handler sets `agentSkills` and closes it.
  - Delete `src/components/AgentSkills/AgentSkillsField.tsx`.
  - Keep `SkillsSelector.tsx` and `SkillChip.tsx` until slice 4 only if something still imports them; otherwise delete them and their test now.
- [x] 2.5 Component tests in `src/components/Skills/SkillsList/tests/SkillsList.test.tsx`:
  - items are listed in order with their initials and name;
  - the version is shown only when present;
  - a missing skill shows the id-derived name;
  - no remove button is rendered;
  - each item is a button named "<name> details".
  - Update the Skills cases in `src/components/AddOns/tests/AddOnsSection.test.tsx`, `src/components/tests/QuickApp2Form.test.tsx` and `src/components/tests/QuickApp2Form.behavior.test.tsx` that relied on chips or chip removal.
  - Verification: `npx vitest run src/components/Skills src/components/AddOns src/components/tests/QuickApp2Form.test.tsx src/components/tests/QuickApp2Form.behavior.test.tsx`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 3. Vertical slice: skill details popup with Delete

Depends on 2.

- [x] 3.1 Create `src/components/Skills/SkillDetailsPopup/SkillDetailsTab.tsx` (props `SkillDetailsTabProps { skill?: DialSkill }`). It uses `useSkillManifest(skill)` and renders:
  - Ready: `ContentTab` from `@epam/ai-dial-catalog` with `content=manifest.body` and `description=manifest.description ?? skill.description`;
  - Loading: the listing description plus a `Spinner` (`ariaLabel` `LoadingSkillContent`);
  - Error: the listing description, `FailedToLoadSkillContent` and a Retry `NeutralButton` (`quickAppEditor` `Retry`) wired to `retry`;
  - no skill: a `NoDataContent` with `SkillUnavailable`.
- [x] 3.2 Create `src/components/Skills/SkillDetailsPopup/SkillOverviewTab.tsx` (props `SkillOverviewTabProps`). It renders `getSkillOverviewRows` as a `<dl>` in `grid grid-cols-[auto_1fr] gap-x-6 gap-y-3`, and uses `useMemo` on skill, user bucket, language and labels.
- [x] 3.3 Create `src/components/Skills/SkillDetailsPopup/SkillDetailsPopup.tsx` (props `SkillDetailsPopupProps { skillId: string; skill?: DialSkill; isReadonly: boolean; onRemove: (id: string) => void; onClose: () => void }`):
  - the kit `Popup` `open`, `PopupSize.Lg`, `ariaLabel` = name, `closeAriaLabel` `common` `CloseDialog`;
  - a header node with `DeploymentIcon`, the `SkillTypeLabel` caption and the name;
  - kit 2.0 `Tabs` (Details / Overview) with local `activeTab`, defaulting to Details;
  - `additionalButtons` = Delete (`ButtonVariant.Danger`, `IconTrash`), omitted when `isReadonly`, with `additionalButtonsOnLeft`;
  - `mainButtons` = Close (`quickAppEditor` `Close`, primary link). Delete calls `onRemove(skillId)` and then `onClose()`.
- [x] 3.4 Wire the popup into `SkillsList.tsx` through `React.lazy` + `Suspense fallback={null}`, using the `DefaultModelBlock.tsx:19-24` pattern (design D2). It is mounted while `openSkillId != null`, and `onRemove` is forwarded. Focus returns to the opener item on close: rely on `Popup`'s focus restore and fall back to the list's first item when the opener was removed.
- [x] 3.5 Component tests:
  - `src/components/Skills/SkillDetailsPopup/tests/SkillDetailsPopup.test.tsx`, with `fetchSkillManifest` mocked:
    - the dialog is named by the skill;
    - Details is selected and shows the description plus the rendered body without frontmatter;
    - Overview shows Author, Folder and Updated, and hides Version when absent;
    - Delete calls `onRemove` and then `onClose`;
    - read-only renders only Close;
    - the error state shows Retry, which refetches;
    - the unavailable skill state makes no request and shows `SkillUnavailable` and Delete.
  - `SkillsList.test.tsx`:
    - activating an item opens the popup;
    - Delete in the popup removes the id from the `onRemove` caller's value and closes the popup;
    - Escape closes without change.
  - `QuickApp2Form.behavior.test.tsx`: removing a skill through the popup makes the form dirty and saves the remaining `skills`.
  - Verification: `npx vitest run src/components/Skills src/components/tests/QuickApp2Form.behavior.test.tsx`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 4. Vertical slice: Add skill popup (BLOCKED on the upstream catalog release)

Depends on 1 and 2, and on the ai-dial-chat `libs/catalog` `ListView` multi-select (design D5) being released.

- [x] 4.1 Gate: confirm that the released `@epam/ai-dial-catalog` exposes the multi-select `ListView` props from design D5, by reading `node_modules/@epam/ai-dial-catalog/models/list-props.d.ts` after the bump. Bump the version in `package.json` and run `npm install`. If the prop names differ from D5, update design D5 and the tasks below before continuing.
- [x] 4.2 Add the `quickAppEditor` keys `AddSkill` ("Add skill"), `SkillsCatalog` ("Skills catalog"), `LoadingSkills`, `FailedToLoadSkills`, `SelectSkill` ("Select {{name}}") and `SelectAllSkills` to `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json`.
- [x] 4.3 Create `src/components/Skills/AddSkillsModal/AddSkillsModal.tsx` (props `AddSkillsModalProps { value: string[]; onConfirm: (ids: string[]) => void; onClose: () => void }`) by mirroring `ModelCatalogModal.tsx`:
  - kit `Popup` with `AddSkill` title, dividers and `PopupSize.Lg`;
  - `ItemHeader` with `SkillsCatalog` + count;
  - sort `ButtonDropdown` (`SORT_KEYS` as in the model picker);
  - `Search` (`SearchAgentSkills`) + catalog `Filter` (topics from `getTopicOptions`, "My");
  - `ListView` with `type={CatalogEntityType.Skill}`, multi-select props and `columnVisibility={{ favorite: () => false }}`;
  - rows memoised from `mapSkillToCatalogItem` + `filterCatalogItemsByQuery`;
  - local `checkedIds: string[]`, with the toggle, select-all and confirm-order rules from design D4;
  - the loading, error (Retry → `refreshAll`), no-results and empty-catalog states from the spec;
  - Add disabled while not ready.
- [x] 4.4 In `src/components/AgentSkills/AgentSkillsFormSection.tsx`, replace the old `SkillsModal` with a lazily loaded `AddSkillsModal` (`React.lazy` + `Suspense fallback={null}`). Delete `src/components/common/SkillsSelector/` (`SkillsModal.tsx`, and `SkillsSelector.tsx`, `SkillChip.tsx` and `tests/SkillsSelector.test.tsx` if still present).
  - Remove `QuickAppEditorI18nKeys.SelectAgentSkills` and its locale entry.
  - Remove `SelectedLabel` / `NoResourcesSelected` only if a repo-wide search shows no other user.
- [x] 4.5 Component tests in `src/components/Skills/AddSkillsModal/tests/AddSkillsModal.test.tsx`:
  - the dialog "Add skill" opens with the heading, count, search, From, sort and column headers;
  - attached skills are pre-checked and select-all is `mixed`;
  - toggling a checkbox and a row click toggle a skill;
  - select-all affects only the filtered rows and keeps hidden checked ones;
  - unchecking `a` and checking `c`, `d` on `["a", "b"]` → `onConfirm(["b", "c", "d"])`;
  - an attached id with no row is kept in place;
  - Cancel and Escape don't call `onConfirm`;
  - search and the "My" filter narrow the rows and the count;
  - the loading, error with Retry, no-results and empty-catalog states.
  - Update the Skills cases in `src/components/tests/QuickApp2Form.behavior.test.tsx` that opened the old modal.
  - Verification: `npx vitest run src/components/Skills src/components/AgentSkills src/components/tests`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 5. RTL, docs, final checks

Depends on 3 (and on 4 for the Add skill part).

- [x] 5.1 RTL pass over `src/components/Skills/**` (`.claude/rules/rtl.md`):
  - only logical utilities (`ms/me`, `ps/pe`, `start/end`, `text-start`);
  - no physical `ml/mr/pl/pr/left/right/text-left/text-right`;
  - no mirrored icons (avatar, trash, ×, folder, funnel, chevron and search are symmetric);
  - Delete at the start and Close at the end of the details popup footer through `additionalButtonsOnLeft`.
  - Add an RTL test case to `SkillsList.test.tsx` and `SkillDetailsPopup.test.tsx` that sets `document.documentElement.dir = 'rtl'` and asserts the DOM order of avatar → name, and Delete before Close.
  - Verification: `npx vitest run src/components/Skills`, `npm run lint`.
- [x] 5.2 Update `docs/TECH_DEBT.md`:
  - set `skills_catalog` to "Spec exists: In change" in the matrix (it becomes "Yes" once the change is archived into `openspec/specs/`);
  - under "Skills", point at `openspec/specs/skills_catalog`, and fix the stale `src/app/api/dial-skills/catalog` source path to `src/utils/dialClient.ts` (`fetchDialSkills`) and `src/components/Skills/**`;
  - remove the "AgentSkillsField just proxy SkillsSelectors" item;
  - add follow-ups: a chat-api ask for `version`/`tags` on `SkillMetadataItemDto`; resolving the manifest path via `listSkillFiles` for Core versions that store it under `files/`; an optional bundled-file tree in the Details tab.
- [x] 5.3 Final verification: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (confirms that both popups land in the lazy catalog chunk, not the main chunk), `openspec validate redesign-skills-selection --strict`.
