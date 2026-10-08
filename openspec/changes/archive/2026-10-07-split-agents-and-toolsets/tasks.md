Slicing strategy: **contract first, then vertical slices.**

- Slice 1 fixes the shared types and pure logic: the partition, the selection rule, the mappers and the tools fetch.
- Slice 2 extracts the row item from Skills.
- Slices 3–6 each bring one path through the UI to working end to end:
  - slice 3: the two rows with remove and pickers;
  - slice 4: the agent popup with Connection/Credentials;
  - slice 5: the toolset popup with Log in;
  - slice 6: the Tools tab.
- The change ships as one release. Between slices 3 and 5 the old chip actions (gear, chip-click login) are temporarily gone, which is acceptable because nothing is released mid-change.
- Every slice leaves `npm run lint`, `npm run typecheck` and `npm test` green.

Before starting, read `AGENTS.md`, `.claude/rules/all-ts.md`, `.claude/rules/all-tsx.md` and `.claude/rules/rtl.md`. Follow these conventions:

- extensionless code imports, the `@/` alias, arrow-function exports;
- string enums in `src/types/`, `is/has/can` booleans, `on/handle` handlers;
- `mergeClasses` for conditional classes;
- `DIAL_ICON_SIZE` / `DIAL_KIT_ICON_STROKE` for icons;
- no nested ternaries.

Confirm kit props with the ui-kit MCP (`getEntityDetails`) before using `Popup`, `EntityIdentity`, `Tabs`, `Search`, `Spinner`, `NoDataContent`, `GhostIconButton` and `ButtonProps`. Component tests go in a `tests/` subfolder and use role, label and text queries.

## 1. Contract: types, partition, selection, mappers, tools fetch

- [x] 1.1 Add `src/types/add-on-kind.ts` (`enum AddOnKind { Toolset = 'toolset', Agent = 'agent' }`) and `src/types/toolset-tools.ts` (`enum ToolsStatus { Idle = 'idle', Loading = 'loading', Ready = 'ready', Error = 'error' }`).
  - Verification: `npm run typecheck`.
- [x] 1.2 Create `src/utils/get-add-on-kind.ts` (design D1). It exports:
  - `buildAddOnEntityMap(models, toolsets, mcpAgents, language)`: the id map plus the toolset display-name index moved from `src/components/ContextAndTools/AgentsAndToolsetsField.tsx:42-62`. Id-keyed entries win, and on a name collision the first toolset wins;
  - `getAddOnKind(entry, entityMap): AddOnKind`;
  - `partitionAddOnIds(entries, entityMap): { toolsetIds: string[]; agentIds: string[] }`, which keeps array order.

  The branches must mirror `getQuickApp2Toolsets` (`src/form/quickApp2Form.ts:346-405`).
- [x] 1.3 Add `fetchToolsetToolNames = async (toolsetId: string, signal?: AbortSignal): Promise<string[]>` to `src/utils/dialClient.ts`. It calls `deploymentsApi.getDeploymentDetails({ deployment: toolsetId }, { signal })` and returns `allowedTools` when non-empty, else `allToolNames ?? []`.
  - Check against a running chat-api, or its source in `C:\projects\ai-dial-chat`, which `deployment` form it expects for a toolset id (full `toolsets/…` id vs. bucket-relative). Update the example in `specs/toolsets_selection/spec.md` and design D4 if it differs.
- [x] 1.4 Rename `src/utils/apply-skill-selection.ts` → `src/utils/apply-catalog-selection.ts` (`applyCatalogSelection`), with neutral doc wording. Update `src/components/Skills/AddSkillsModal/AddSkillsModal.tsx` and move `src/utils/tests/apply-skill-selection.test.ts` → `apply-catalog-selection.test.ts`. Behaviour is unchanged.
- [x] 1.5 Create `src/utils/map-toolset-to-catalog-item.ts` (design D3) with:
  - `mapToolsetToCatalogItem`;
  - `mapToolsetCredentials` (`authSettings` → `CatalogItemCredentials`; `undefined` for `NONE`; user vs. global status by `isPublicToolsetId`);
  - `getToolsetOverviewRows` (Authentication, Folder via `getCatalogFolder`, Updated via `Intl.DateTimeFormat(language, { dateStyle: 'medium' })`, Version; empty rows omitted);
  - `filterToolNames(names, query)`.
- [x] 1.6 Create `src/utils/map-agent-to-catalog-item.ts` with:
  - `mapAgentToCatalogItem`, wrapping `mapModelToCatalogItem` and setting `type` to `CatalogEntityType.Model` for models and `CatalogEntityType.Agent` otherwise;
  - `getAgentOverviewRows` (Folder, Updated, Version, and Connection only for MCP-capable apps: unset → `MCP`, `auto` → omitted).
- [x] 1.7 Create `src/hooks/use-toolset-tools.ts`: `useToolsetTools(toolsetId?: string, isEnabled = false): { status: ToolsStatus; names: string[]; retry: () => void }`.
  - It fetches in `useEffect` with an `AbortController` and a cancelled flag, and refetches on `toolsetId` or the retry nonce.
  - It returns `Idle` and makes no request when `!isEnabled` or there is no id.
  - `retry` uses `useCallback`.
- [x] 1.8 Unit tests:
  - `src/utils/tests/get-add-on-kind.test.ts`, table-driven over every branch: toolset entity; agent and model entities; a `toolsets/…` id missing from the catalog; an `applications/…` id missing from the catalog; an inline MCP config without `deployment_id`; a dial-deployment tool with an unknown model; a display-name match. Also: `partitionAddOnIds` keeps order.
  - `src/utils/tests/apply-catalog-selection.test.ts`: the moved cases, plus "ids of the other kind (unlisted) keep their positions".
  - `src/utils/tests/map-toolset-to-catalog-item.test.ts`: folder; credentials for OAuth signed out/in, API key and `NONE`; overview rows; `filterToolNames` with a trimmed, case-insensitive query.
  - `src/utils/tests/map-agent-to-catalog-item.test.ts`: Model vs. Agent type; overview rows with and without Connection.
  - `src/utils/tests/dialClient.test.ts`: `fetchToolsetToolNames` request params, allow-list precedence, and an empty fallback.
  - `src/hooks/tests/use-toolset-tools.test.tsx` (mock `fetchToolsetToolNames`): idle while disabled; Loading → Ready; Error → `retry` → Ready; a stale response after an id switch is ignored; abort on unmount.
  - Verification: `npx vitest run src/utils/tests/get-add-on-kind.test.ts src/utils/tests/apply-catalog-selection.test.ts src/utils/tests/map-toolset-to-catalog-item.test.ts src/utils/tests/map-agent-to-catalog-item.test.ts src/utils/tests/dialClient.test.ts src/hooks/tests/use-toolset-tools.test.tsx src/components/Skills`, `npm run lint`, `npm run typecheck`.

## 2. Shared row item

Depends on nothing; can run in parallel with 1.

- [x] 2.1 Create `src/components/common/AddOnListItem/AddOnListItem.tsx` (props `AddOnListItemProps`; design D2) from `src/components/Skills/SkillsList/SkillListItem.tsx`:
  - avatar (`DeploymentIcon` with `iconUrl` or `initialsName`) in a `relative` wrapper, with an optional `badge` node;
  - `ItemHeader` with the name and optional version;
  - an optional `statusText` line;
  - `detailsLabel` / `removeLabel` as accessible names;
  - the hover/focus-revealed `GhostIconButton` trash, rendered only when `onRemove` is passed.

  It must not import `@epam/ai-dial-catalog`.
- [x] 2.2 Create `src/hooks/use-list-remove-focus.ts` from the refocus logic in `src/components/Skills/SkillsList/SkillsList.tsx:25-44`. It returns `{ listRef, markRemoval }` and focuses the list's first button after the value changes.
- [x] 2.3 Make `SkillListItem` / `SkillsList` use `AddOnListItem` and `useListRemoveFocus`. Delete `SkillListItem.tsx` if it becomes a pass-through.
  - Verification: `npx vitest run src/components/Skills src/components/common/AddOnListItem`, `npm run lint`, `npm run typecheck`. The Skills tests must pass unchanged.
- [x] 2.4 Add `src/components/common/AddOnListItem/tests/AddOnListItem.test.tsx`:
  - name, version and status line render;
  - the details button has its accessible name;
  - the trash is absent without `onRemove`;
  - the badge node renders inside the avatar.

## 3. Vertical slice: Toolsets and Agents rows with remove and pickers

Depends on 1 and 2.

- [x] 3.1 Add the row and picker i18n keys from design D10 (rows, items, `ToolsetLoggedOutBadge`, and both pickers' eight keys each) to `QuickAppEditorI18nKeys` in `src/constants/i18n.ts` and to `src/i18n/locales/quick-app-editor.json`, with the English copy from the specs. This repo has one locale file per namespace.
- [x] 3.2 Create `src/components/Toolsets/ToolsetsList/ToolsetsList.tsx` (`memo`, props `ToolsetsListProps { ids: string[]; allIds: string[]; isReadonly: boolean; onChange: (allIds: string[]) => void }`).
  - It renders `AddOnListItem` per id, using the toolset entity from `DataContext` via `buildAddOnEntityMap`.
  - Status text comes from `getEntityStatusMessage(status, true, t)`.
  - The badge is a lazily loaded `ToolsetBadge` (`src/components/Toolsets/ToolsetBadge/ToolsetBadge.tsx`) wrapping `CredentialsBadge` with `mapToolsetCredentials` (design D8).
  - Remove calls `onChange(allIds.without(id))`.
  - It owns `openToolsetId` state; the popup is wired in 5.4.
- [x] 3.3 Create `src/components/Agents/AgentsList/AgentsList.tsx` the same way (no badge; status for missing and undeployed). It owns `openAgentId` state; the popup is wired in 4.4.
- [x] 3.4 Create `src/components/Toolsets/AddToolsetsModal/AddToolsetsModal.tsx` and `src/components/Agents/AddAgentsModal/AddAgentsModal.tsx`, mirroring `src/components/Skills/AddSkillsModal/AddSkillsModal.tsx`. Props: `{ allIds: string[]; kindIds: string[]; onConfirm: (allIds: string[]) => void; onClose: () => void }`.
  - Toolset rows: `toolsets` without hidden folders, mapped by `mapToolsetToCatalogItem`, with `credentialsBadgeLoggedOutLabel`.
  - Agent rows: `models` + `mcpAgents` without hidden folders and without `getEntityIdWithoutVersion(app.id)`, mapped by `mapAgentToCatalogItem`.
  - `checkedIds` starts from `kindIds`. Add calls `onConfirm(applyCatalogSelection(allIds, checkedIds, listedIds))`.
  - Loading, error (Retry → `refreshAll`), no-results and empty-catalog states as specified.
- [x] 3.5 Create `src/components/Toolsets/ToolsetsFormSection/ToolsetsFormSection.tsx` and `src/components/Agents/AgentsFormSection/AgentsFormSection.tsx`, mirroring `src/components/AgentSkills/AgentSkillsFormSection.tsx`:
  - an `AddOnRow` with the title, description and Add tooltip keys;
  - the list as row content;
  - the picker as `React.lazy` + `Suspense`.

  `AgentsFormSection` seeds `isAddModalOpen` from `AgentsAndToolsetsModalQueryParams.Modal === '1'` and never opens it when read-only (design D9).
- [x] 3.6 In `src/components/AddOns/AddOnsSection.tsx`:
  - compute `partitionAddOnIds` with `useMemo`;
  - render Skills → `ToolsetsFormSection` → `AgentsFormSection` → Conversation starters;
  - pass `allIds`, the kind ids, `isReadonly`, `tooltip`, `onAgentsChange` and (for agents) `onConfigureAgent`;
  - remove the merged `AddOnRow`, the `isAgentsModalOpen` state and the `AgentsAndToolsetsField` import.
- [x] 3.7 Component tests:
  - `src/components/Toolsets/ToolsetsList/tests/ToolsetsList.test.tsx`: listed in order with names and versions; badge on a signed-out OAuth toolset; missing toolset shows the id name and the unavailable text; trash removes only that id from `allIds` and refocuses; no trash when read-only.
  - `src/components/Agents/AgentsList/tests/AgentsList.test.tsx`: the same, plus a model listed as an agent and the undeployed status text.
  - `src/components/Toolsets/AddToolsetsModal/tests/AddToolsetsModal.test.tsx` and `src/components/Agents/AddAgentsModal/tests/AddAgentsModal.test.tsx`:
    - only their kind is listed (the agent picker excludes the current app);
    - attached ids are pre-checked;
    - `[A1, T1, T2]` − `T1` + `T3` → `onConfirm([A1, T2, T3])`;
    - Cancel/Escape don't confirm;
    - search, "My" filter and count;
    - loading, error with Retry, and empty states.
  - Update `src/components/AddOns/tests/AddOnsSection.test.tsx`: row order; each row's empty description; the partition across rows; the deep link opens Add agent; Add is disabled when read-only.
- [x] 3.8 Delete `src/components/ContextAndTools/AgentsAndToolsetsField.tsx` and `src/components/ContextAndTools/tests/AgentsAndToolsetsField.test.tsx`. Delete `src/components/common/AgentAndToolsetSelector/{AgentAndToolsetSelector,AgentAndToolsetModal,AgentAndToolsetChip,ChipTooltipContent}.tsx` and their tests. Keep `ToolsetLoginModal.tsx` and `EntityInfoModal.tsx` until 5.x / 4.x if still imported. Update the Agents & Toolsets cases in `src/components/tests/QuickApp2Form.test.tsx` and `src/components/tests/QuickApp2Form.behavior.test.tsx` that relied on chips or the card modal.
  - Verification: `npx vitest run src/components/Toolsets src/components/Agents src/components/AddOns src/components/tests`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 4. Vertical slice: agent details popup with Connection and Credentials

Depends on 3.

- [x] 4.1 Add the popup keys for agents (`AgentTypeLabel`, `Model`, `AboutTab`, `SkillOverviewTab`, `NoDescription`, `SkillFolder`, `SkillUpdated`, `SkillVersion`, `RemoveSkillFromApp`, `AgentUnavailable`, `AgentConnection`) to `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json`.
- [x] 4.2 Create `src/components/common/EntityAboutTab/EntityAboutTab.tsx` (props `EntityAboutTabProps { description?: string; topics?: string[] }`): a Markdown description (design D2: confirm the renderer export first) + `TopicsLine`, or `NoDescription`.
- [x] 4.3 Move `src/components/ContextAndTools/DialAppConfigurationModal.tsx` → `src/components/Agents/DialAppConfigurationModal/DialAppConfigurationModal.tsx` (props unchanged) and update its imports. Create `src/components/Agents/AgentDetailsPopup/AgentDetailsPopup.tsx` (props `AgentDetailsPopupProps { agentId: string; agent?: DialModel; transport?: DialAppTransportType; fallbackName: string; isReadonly: boolean; onRemove; onConfigure: (id, transport) => void; onClose }`) per design D5/D7:
  - header with caption by type and folder line;
  - an action row with Connection (MCP-capable apps) and Credentials (gate from `useApplicationAuthentication` + `applicationCredentials=true`), both hidden when read-only;
  - status banner;
  - `Tabs` About / Overview (`AgentOverviewTab.tsx` renders `getAgentOverviewRows` as a `<dl>`, memoised);
  - Delete/Close footer.
- [x] 4.4 Wire the popup into `AgentsList.tsx` with `React.lazy` + `Suspense`:
  - mounted while `openAgentId != null`;
  - the transport dialog is mounted on top while configuring and returns focus to Connection;
  - `onRemove` uses the list's remove path.

  Delete `src/components/common/AgentAndToolsetSelector/EntityInfoModal.tsx` if nothing else imports it.
- [x] 4.5 Component tests in `src/components/Agents/AgentDetailsPopup/tests/AgentDetailsPopup.test.tsx`:
  - dialog named by the agent; About selected with the description and topics; Overview rows;
  - Model caption without actions for a model;
  - Connection → choose Chat completion → `onConfigure(id, 'chat-completion')` with the popup still open;
  - Credentials posts one `REQUEST_APPLICATION_CREDENTIALS` only with `applicationCredentials=true`;
  - unavailable agent: no actions, and Delete still shown;
  - Delete calls `onRemove` then `onClose`;
  - read-only shows only Close.

  In `AgentsList.test.tsx`: activating an item opens the popup, and Escape closes it without changes.
  - Verification: `npx vitest run src/components/Agents src/components/common/EntityAboutTab`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 5. Vertical slice: toolset details popup with Log in / Log out

Depends on 3; reuses 4.2.

- [x] 5.1 Add the toolset popup keys (`ToolsetTypeLabel`, `ToolsTab`, `DetailsAuthentication`, `AuthTypeOAuth`, `ApiKeyLabel`, `RemoveSkillFromApp`, `ToolsetUnavailable`) to `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json`.
- [x] 5.2 Move `src/components/common/AgentAndToolsetSelector/ToolsetLoginModal.tsx` → `src/components/Toolsets/ToolsetLoginModal/ToolsetLoginModal.tsx`. Change its prop to `toolset: DialToolset` and remove its OAuth branch (design D6). Delete the now-empty `src/components/common/AgentAndToolsetSelector/` folder.
- [x] 5.3 Create `src/components/Toolsets/ToolsetDetailsPopup/ToolsetCredentialsAction.tsx` (props `ToolsetCredentialsActionProps { toolset: DialToolset }`):
  - OAuth: `postToHost` `REQUEST_TOOLSET_LOGIN`/`LOGOUT`, a `message` listener filtered by `isOriginAllowed` + `toolsetId`, `applyToolsetAuthResult` on success, `ToolsetSignInFailed` on failure, busy labels;
  - API key: opens `ToolsetLoginModal`.
- [x] 5.4 Create `src/components/Toolsets/ToolsetDetailsPopup/ToolsetDetailsPopup.tsx` (props `ToolsetDetailsPopupProps { toolsetId; fallbackName; isReadonly; onRemove; onClose }`):
  - it reads the toolset live from `DataContext.toolsetsMap` (design D6);
  - header with the avatar + `ToolsetBadge`, caption, version and folder line;
  - `ToolsetCredentialsAction` when editable and auth is not `NONE`;
  - logged-out banner;
  - `Tabs` About (`EntityAboutTab`) / Overview (`ToolsetOverviewTab.tsx` from `getToolsetOverviewRows`) / Tools (a placeholder panel until 6.x);
  - Delete/Close footer.

  Wire it into `ToolsetsList.tsx` with `React.lazy` + `Suspense`.
- [x] 5.5 Component tests in `src/components/Toolsets/ToolsetDetailsPopup/tests/ToolsetDetailsPopup.test.tsx`:
  - dialog named by the toolset with the caption, version and three tabs, About selected;
  - Overview rows;
  - OAuth Log in posts one `REQUEST_TOOLSET_LOGIN`; a matching success result turns the button into Log out and removes the badge; a failure shows the error; messages from a foreign origin or another toolset id are ignored;
  - API-key Log in opens the API-key popup;
  - unavailable toolset: no request, no action, and Delete still shown;
  - Delete → `onRemove`, `onClose`;
  - read-only: only Close.

  In `ToolsetsList.test.tsx`: activating an item opens the popup.
  - Verification: `npx vitest run src/components/Toolsets`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 6. Vertical slice: Tools tab

Depends on 1.7 and 5.

- [x] 6.1 Add `SearchTools`, `ToolsCount` (plural forms per the repo's i18next setup; check `src/i18n/index.ts`), `LoadingTools`, `FailedToLoadTools` and `NoToolsReported` to `src/constants/i18n.ts` and `src/i18n/locales/quick-app-editor.json`.
- [x] 6.2 Create `src/components/Toolsets/ToolsetDetailsPopup/ToolsetToolsTab.tsx` (props `ToolsetToolsTabProps { toolsetId: string; isEnabled: boolean }`):
  - `useToolsetTools`;
  - `Search`, then the count, then a `<ul aria-label={ToolsTab}>` of names filtered by `filterToolNames` (memoised);
  - loading spinner, error with Retry, `NoToolsReported`, `NoResultsFound`.

  In `ToolsetDetailsPopup`, keep a `hasOpenedTools` flag set on the first Tools selection and pass it as `isEnabled`.
- [x] 6.3 Tests in `src/components/Toolsets/ToolsetDetailsPopup/tests/ToolsetToolsTab.test.tsx`, with `fetchToolsetToolNames` mocked:
  - no request until Tools is selected;
  - names and count render;
  - search narrows the list and the count;
  - no matches → `NoResultsFound`;
  - error → Retry refetches;
  - an empty response → `NoToolsReported`;
  - switching tabs back to Tools doesn't refetch.
  - Verification: `npx vitest run src/components/Toolsets`, `npm run lint`, `npm run typecheck`, then the full `npm test`.

## 7. RTL, cleanup, docs, final checks

Depends on 3–6.

- [x] 7.1 RTL pass over `src/components/{Toolsets,Agents}/**`, `src/components/common/{AddOnListItem,EntityAboutTab}/**` (`.claude/rules/rtl.md`):
  - only logical utilities;
  - no mirrored icons;
  - Delete at the start and Close at the end through `additionalButtonsOnLeft`;
  - the badge at bottom-end.

  Add RTL cases (`document.documentElement.dir = 'rtl'`) to `ToolsetsList.test.tsx` and `ToolsetDetailsPopup.test.tsx`, asserting avatar → name → trash DOM order and Delete before Close.
  - Verification: `npx vitest run src/components/Toolsets src/components/Agents`, `npm run lint`.
- [x] 7.2 Remove the now-unused i18n keys listed in design D10 from `src/constants/i18n.ts`, `src/i18n/locales/quick-app-editor.json` and the `common` locale file, each only after a repo-wide search shows no user. Delete `src/components/common/VirtualCardGrid/`, `FavoriteStarButton/` and `EntityScopeLine/` only if they are unused.
- [x] 7.3 Update `docs/TECH_DEBT.md`:
  - matrix: `toolsets_selection` → "Spec exists: In change", and a new row `agents_selection`;
  - "Toolsets" candidate: point at `src/components/Toolsets/**`, `src/utils/get-add-on-kind.ts` and `src/utils/dialClient.ts` (`fetchToolsetToolNames`), and fix the stale `src/app/api/dial-toolsets/{signin,signout}` and `components/common/AgentAndToolsetSelector/**` paths;
  - replace the "Add-ons: … splits Agents & Toolsets …" item with a remaining "Knowledge base row" follow-up;
  - add follow-ups: document `agentsAndToolsetsModal` in `host-integration` once its target picker is confirmed; tool descriptions and schemas (chat-api ask); `toolsets_login` spec for the host round-trip.
- [x] 7.4 Final verification: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (confirm that the popups, pickers and `ToolsetBadge` land in lazy chunks and not the main chunk; if the badge doesn't, apply design D8's fallback), and `openspec validate split-agents-and-toolsets --strict`.
