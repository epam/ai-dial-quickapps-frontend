## Context

**Current code path.**

- `AddOnsSection.tsx:59-75` renders one `AddOnRow` around `AgentsAndToolsetsField`. It owns `isAgentsModalOpen`, seeded from the `agentsAndToolsetsModal=1` query param (`:45-47`).
- `AgentsAndToolsetsField` (`src/components/ContextAndTools/AgentsAndToolsetsField.tsx`):
  - merges `modelsMap`, `toolsetsMap` and `mcpAgentsMap` into `allItemsMap`;
  - also indexes toolsets by display name, for inline configs saved without a `deployment_id` (`:42-62`);
  - sorts the ids by name;
  - renders `common/AgentAndToolsetSelector/AgentAndToolsetSelector.tsx`, plus `DialAppConfigurationModal` and `EntityInfoModal`.
- The selector renders:
  - chips (`AgentAndToolsetChip`), whose click opens the info modal, the toolset login modal or the host credential forms, plus a hover gear;
  - the card-grid `AgentAndToolsetModal`;
  - `ToolsetLoginModal`.

**Form.** `agentsAndToolsets: { '[schema]:id', '[schema]:tool'?, '[schema]:isDialDeploymentTool'? }[]` is owned by `useQuickApp2Form`.

- `SET_AGENT_IDS` (`src/hooks/use-quick-app2-form.ts:198-210`) rebuilds the array from ids and keeps each surviving entry's object, so tool data such as `transport` survives.
- `CONFIGURE_AGENT` (`:211-227`) sets `transport`.
- Load (`getAgentsAndToolsetsFormValue`, `src/form/quickApp2Form.ts:134-171`) and save (`getQuickApp2Toolsets`, `:327-433`) classify each entry by entity `type`, falling back to `isApplicationId` / `isToolsetId` / `isDialDeploymentTool`. None of this changes.

**Data.** `DataContext` already loads `models`, `toolsets` (with `authSettings`), `mcpAgents`, `userBucket` and `status`, and exposes `refreshToolsets`, `applyToolsetAuthResult` and `refreshAll`. Toolset listings have no tool names. chat-api's `GET /api/v1/deployments/{deployment}/details` returns `toolsetDetails.allowedTools` / `allToolNames` (`@epam/ai-dial-chat-api-client` `DeploymentsApi.getDeploymentDetails`, `ToolsetDetailsDto`). ai-dial-chat uses the same pair for its Tools tab (`libs/chat-hooks/src/catalog/map-entity-details-to-catalog.ts:320-332`).

**Reference pattern.** The skills redesign (`openspec/specs/skills_catalog`):

- `SkillsList` / `SkillListItem` are the row;
- `SkillDetailsPopup` is a kit `Popup` with `EntityIdentity`, kit 2.0 `Tabs`, and a Delete/Close footer;
- `AddSkillsModal` uses catalog `ListView` multi-select, `Filter`, sort and `Search`, with `applySkillSelection`;
- the popups are lazy-loaded because the catalog bundle pulls in ag-grid.

**Installed catalog** (`@epam/ai-dial-catalog` 1.2.0-dev.310):

- `ListView` multi-select is available;
- `CatalogItem.credentials` makes `ListView` draw `CredentialsBadge`;
- `CredentialsBadge` is exported;
- `Tools` and `AboutTab` are **not** exported.

**User decisions:**

- Models go in the Agents row.
- Agent configuration (transport, application credentials) moves into the details popup header.

## Goals / Non-Goals

**Goals:**

- Separate Toolsets and Agents rows over the one `agentsAndToolsets` value, each with the skills-style list, picker and details popup.
- A toolset Tools tab backed by chat-api details, and Log in / Log out from the popup.
- Agent Connection / Credentials from the popup.
- Delete the `AgentAndToolsetSelector` / `AgentsAndToolsetsField` layer.

**Non-Goals:** the Knowledge base row, a form-value split, a save-mapping change, tool descriptions and schemas, admin credential management, and host protocol changes (see proposal).

## Decisions

### D1. Partition, not split

`getAddOnKind(entry, maps): AddOnKind` in `src/utils/get-add-on-kind.ts`. `AddOnKind` is a string enum (`Toolset = 'toolset'`, `Agent = 'agent'`) in `src/types/add-on-kind.ts`.

**Toolset** when any of these holds:

- the resolved entity has `type === 'toolset'` (resolved by id, then by the toolset display-name index moved from `AgentsAndToolsetsField.tsx:55-61` into a pure `buildAddOnEntityMap(models, toolsets, mcpAgents, language)` in the same file);
- there is no entity and `isToolsetId(id)`;
- there is no entity, no `isDialDeploymentTool`, the id is not an application id, and the tool data is not a dial-app config. These are inline MCP/unknown configs, which `getQuickApp2Toolsets` saves as `otherToolsets`/MCP.

**Agent** otherwise.

`AddOnsSection` computes `{ toolsetIds, agentIds }` once with `useMemo` (on `agentsAndToolsets` and the maps) and passes each row its ids. The rows edit through one callback, `onAgentsChange(nextAllIds)` (= `setAgentIds`), always with the **full** id list:

- **Remove:** `allIds.filter(id => id !== removed)`.
- **Picker confirm:** `applyCatalogSelection(allIds, checkedIds, listedIds)`. The other kind's ids are never in `listedIds`, so the existing "keep unlisted ids in place" rule keeps them where they are, with no new merge logic. `SET_AGENT_IDS` keeps each entry's object, so tool data survives.

`applySkillSelection` is renamed to `applyCatalogSelection` (`src/utils/apply-catalog-selection.ts`) and `AddSkillsModal` is updated. Its behaviour is unchanged and its tests move with it.

_Alternative:_ separate `toolsets` / `agents` form fields. Rejected in the proposal (load/save/test churn, rollback risk).

**Ordering.** The rows show their entries in array order, like Skills, instead of today's name sort (`AgentsAndToolsetsField.tsx:64-71`). The load mapping already sorts `tool_sets` by name (`quickApp2Form.ts:150-153`), so a freshly loaded app looks the same. After an edit, new items appear at the end, consistent with Skills.

### D2. Component layout

One shared row item, three domain folders, each component in its own PascalCase folder with tests in `tests/`.

- **`src/components/common/AddOnListItem/AddOnListItem.tsx`**, extracted from `SkillListItem`.
  - Props: `id`, `name`, `version?`, `iconUrl?`, `statusText?`, `badge?: ReactNode` (the `CredentialsBadge` slot), `detailsLabel`, `removeLabel`, `onClick`, `onRemove?`.
  - `SkillListItem` becomes a thin wrapper, or `SkillsList` uses it directly. The Skills tests must stay green unchanged.
  - The badge sits in a `relative` avatar wrapper. `CredentialsBadge` positions itself at bottom-end with logical insets.
- **`src/hooks/use-list-remove-focus.ts`**: the "refocus the first item after removal" ref logic from `SkillsList.tsx:25-44`, shared by the three lists.
- **`src/components/Toolsets/`**
  - `ToolsetsList/ToolsetsList.tsx` (`memo`). Props: `ids`, `allIds`, `isReadonly`, `onChange`. It owns `openToolsetId` and lazy-mounts `ToolsetDetailsPopup`.
  - `ToolsetDetailsPopup/ToolsetDetailsPopup.tsx`, plus `ToolsetAboutTab.tsx`, `ToolsetOverviewTab.tsx`, `ToolsetToolsTab.tsx` and `ToolsetCredentialsAction.tsx` (the OAuth/API-key button logic, D6).
  - `AddToolsetsModal/AddToolsetsModal.tsx`.
  - `ToolsetLoginModal/ToolsetLoginModal.tsx`, moved from `common/AgentAndToolsetSelector/`. Only its prop type changes, from `ChipEntity` to `DialToolset`.
- **`src/components/Agents/`**
  - `AgentsList/AgentsList.tsx`;
  - `AgentDetailsPopup/AgentDetailsPopup.tsx`, plus `AgentAboutTab.tsx` and `AgentOverviewTab.tsx`;
  - `AddAgentsModal/AddAgentsModal.tsx`;
  - `DialAppConfigurationModal/DialAppConfigurationModal.tsx`, moved from `ContextAndTools/`.
- **Shared About renderer.** About for both kinds is the same, so it is one component: `src/components/common/EntityAboutTab/EntityAboutTab.tsx` (Markdown description + `TopicsLine`, or `NoDescription`). Use the Markdown renderer `ContentTab` already uses, via `ContentTab` with `content=description` if that renders acceptably; otherwise use `MarkdownRenderer` from `@epam/ai-dial-chat-shared`. Confirm the export.

`AddOnsSection.tsx` renders `<ToolsetsFormSection>` and `<AgentsFormSection>`, mirroring `AgentSkillsFormSection`: each owns its `isAddModalOpen` and its `AddOnRow`, and lazy-mounts its picker. They live in `src/components/Toolsets/ToolsetsFormSection/` and `src/components/Agents/AgentsFormSection/`.

**Deleted:**

- `src/components/common/AgentAndToolsetSelector/**`, except the moved login modal;
- `src/components/ContextAndTools/AgentsAndToolsetsField.tsx` and its test;
- `ChipTooltipContent`;
- `EntityInfoModal`;
- `VirtualCardGrid` / `FavoriteStarButton` / `EntityScopeLine` only if a repo-wide search shows no other user.

_Alternative:_ one generic `AddOnDetailsPopup` driven by a kind switch. Rejected: toolsets and agents have different header actions, tabs and fetches, and a switch-heavy component is harder to test than two small ones over shared pieces (row item, About tab, `EntityIdentity`).

### D3. Catalog mapping

- **`mapToolsetToCatalogItem(toolset, { userBucket, scopeLabels, language })`** (`src/utils/map-toolset-to-catalog-item.ts`):
  - `type: CatalogEntityType.Toolset`;
  - `folder` from `getCatalogFolder(getEntityScopeInfo(id, userBucket), scopeLabels)`;
  - `topics`, `updatedAt` (via `getUpdatedAtTimestamp`), `iconUrl`, `version ?? ''`;
  - `credentials: mapToolsetCredentials(toolset)`, which converts `authSettings` to `CatalogItemCredentials`. `authenticationType` maps `OAUTH`/`API_KEY`/`NONE` to the catalog's `ToolsetAuthenticationType`. `userStatus` / `globalStatus` follow the credentials level that `ToolsetLoginModal.credentialsLevelFor` already uses (public → user, private → global). It is `undefined` for `NONE`.
  - The same file exports `getToolsetOverviewRows(...)`.
- **`mapAgentToCatalogItem(entity, …)`** (`src/utils/map-agent-to-catalog-item.ts`):
  - wraps `mapModelToCatalogItem` for the shared fields;
  - sets `type` to `CatalogEntityType.Model` for `type === 'model'` and `CatalogEntityType.Agent` otherwise;
  - also exports `getAgentOverviewRows(...)`.
- `getAddOnStatusText(status, t)` reuses `getEntityStatusMessage(status, true, t, entityTypeLabel)`, so row and popup wording match. `true` gives the read-only wording, because the row no longer has "click to log in" behaviour.

### D4. Tools fetch

- **Client:** `fetchToolsetToolNames = async (toolsetId: string, signal?: AbortSignal): Promise<string[]>` in `src/utils/dialClient.ts`. It calls `deploymentsApi.getDeploymentDetails({ deployment: toolsetId }, { signal })` and returns `allowedTools?.length ? allowedTools : (allToolNames ?? [])`.
- **Hook:** `useToolsetTools(toolsetId: string | undefined, isEnabled: boolean)` in `src/hooks/use-toolset-tools.ts`.
  - It returns `{ status: ToolsStatus, names: string[], retry }`. `ToolsStatus` lives in `src/types/toolset-tools.ts`.
  - It fetches in `useEffect` with an `AbortController` and a cancelled flag.
  - `isEnabled` turns true on the first Tools selection and stays true. The popup keeps a `hasOpenedTools` flag, so switching tabs back and forth doesn't refetch.
  - `retry` uses a nonce.
- **Search:** filtering is a pure `filterToolNames(names, query)` in the same util file as the mapping, memoised in the tab.
- **Caching:** none across opens. chat-api caches for 60 s per user, and tool lists change after a login.

_Alternative:_ prefetch the details when the popup opens. Rejected: most opens never visit Tools, and the call goes to the MCP server.

### D5. Popup shell and header

Both popups follow `SkillDetailsPopup`:

- kit `Popup` `PopupSize.Lg`, with `ariaLabel` = name;
- `EntityIdentity` header (`EntityType.Toolset` / `Agent` / `Model`, `labels.type` from the caption key, `iconSize` 40);
- `additionalButtons` = Delete with `additionalButtonsOnLeft`, and `mainButtons` = Close (`ButtonVariant.Primary`, `ButtonAppearance.Link`);
- `footerDivider`.

**Header additions.** Confirm `EntityIdentity` props with `getEntityDetails("component", "EntityIdentity")` first.

- Avatar badge and folder line: if `EntityIdentity` can't take a badge or a folder line, the header node becomes `DeploymentIcon` (wrapped with `CredentialsBadge`) + caption + name/version + a folder line rendered with `getCatalogFolder(…).join(' / ')` and a folder icon.
- Header actions (Log in, Connection, Credentials) sit in a `flex gap-2` row between the header and the `Tabs`, inside the body, so the `Popup` header keeps its single × control.

### D6. Toolset credentials action

`ToolsetCredentialsAction` (props `toolset: DialToolset`) moves the OAuth half of `ToolsetLoginModal.tsx:106-155` here:

- `postToHost` with `REQUEST_TOOLSET_LOGIN` / `REQUEST_TOOLSET_LOGOUT`;
- a `message` listener filtered by `isOriginAllowed` and `toolsetId`;
- `applyToolsetAuthResult` on success, and an inline error on failure;
- busy labels.

For API-key toolsets it opens `ToolsetLoginModal`, which keeps its API-key half. Its OAuth branch is then dead and is removed in the move.

Since the popup reads its toolset from `DataContext.toolsetsMap[id]` on every render, not from a snapshot, the badge, the button label and the row update as soon as the status changes.

_Alternative:_ keep `ToolsetLoginModal` for OAuth too, as an intermediate popup. Rejected: the mock shows Log in acting directly from the details popup, and a second popup only to press another Log in adds a step.

### D7. Agent actions

- **Connection.** Opens `DialAppConfigurationModal` (moved; props unchanged: `agentId`, `transport`, `onSave`, `onClose`). `AgentsList` owns `configuringId`, and the details popup stays mounted underneath. On save it calls `onConfigureAgent(id, transport)`, which `AddOnsSection` passes down from `configureAgent`. Focus returns to the Connection button: rely on `Popup`'s focus restore, with a ref fallback.
- **Credentials.**
  - Visibility: `useApplicationAuthentication(id)` (`src/hooks/use-application-authentication.ts`), called only when the URL has `applicationCredentials=true` and the entity is an application; this is today's gate (`AgentAndToolsetSelector.tsx:69-73`, `AgentAndToolsetChip.tsx:117-121`).
  - Click: `requestApplicationCredentials(id, settings.allowedOrigins)`.

### D8. Lazy loading

- `ToolsetDetailsPopup`, `AgentDetailsPopup`, `AddToolsetsModal` and `AddAgentsModal` all import `@epam/ai-dial-catalog`, so each is `React.lazy` + `Suspense fallback={null}`, like `SkillsList.tsx:10-13`.
- `AddOnListItem` must not import `@epam/ai-dial-catalog` from its main module. `CredentialsBadge` is passed in as the `badge` node by `ToolsetsList`, which lazy-loads a tiny `ToolsetBadge` wrapper (`React.lazy`, fallback `null`). This keeps the editor's initial chunk free of the catalog bundle.
- Check with `npm run build`. If the catalog entry point can't be tree-shaken that small, fall back to a local badge built from the kit warning icon with the same label and position, and record it in `docs/TECH_DEBT.md`.

### D9. Deep link `agentsAndToolsetsModal=1`

It is undocumented in `host-integration` and README. It opens the merged picker on load (`AddOnsSection.tsx:45-47`). It now opens **Add agent**: "agents" is the first word of the parameter, and agents are the larger list. The query param enum stays; only the consumer moves into `AgentsFormSection`. See Open Questions.

### D10. i18n

Keys are the English strings themselves and `@typescript-eslint/no-duplicate-enum-values` forbids two keys with one value, so a string Skills already has is reused under its existing key: `SkillDetails`, `RemoveSkill`, `SelectSkill`, `SkillOverviewTab`, `SkillFolder`, `SkillUpdated`, `SkillVersion`, `RemoveSkillFromApp`, `Model` and `ApiKeyLabel`. Renaming them to generic names is a follow-up (`docs/TECH_DEBT.md`), since it would also change the `skills_catalog` spec.

**New `quickAppEditor` keys:**

- **Rows:** `Toolsets`, `ToolsetsDescription`, `AddToolsets`, `Agents`, `AgentsDescription`, `AddAgents`.
- **Items:** `SkillDetails`, `RemoveSkill`, `SkillDetails`, `RemoveSkill`, `ToolsetLoggedOutBadge`.
- **Popups:** `ToolsetTypeLabel`, `AgentTypeLabel`, `Model`, `AboutTab`, `SkillOverviewTab`, `ToolsTab`, `NoDescription`, `DetailsAuthentication`, `SkillFolder`, `SkillUpdated`, `SkillVersion`, `AuthTypeOAuth`, `ApiKeyLabel`, `RemoveSkillFromApp`, `ToolsetUnavailable`, `AgentUnavailable`, `AgentConnection`.
- **Tools:** `SearchTools`, `ToolsCount` (i18next plural: `ToolsCount_one` / `ToolsCount_other`; check how `src/i18n` handles plurals first), `LoadingTools`, `FailedToLoadTools`, `NoToolsReported`.
- **Pickers:** `AddToolset`, `ToolsetsCatalog`, `SearchToolsets`, `LoadingToolsets`, `FailedToLoadToolsets`, `NoToolsetsAvailable`, `SelectSkill`, `SelectAllToolsets`, and the same eight for agents (`AddAgent`, `AgentsCatalog`, `SearchAgents`, `LoadingAgents`, `FailedToLoadAgents`, `NoAgentsAvailable`, `SelectSkill`, `SelectAllAgents`).

**Reused:** `Sort*`, `Filter*`, `NoResultsFound`, `Retry`, `Close`, `LoginToolsetAction`/`LoggingIn…`/`LogoutToolsetAction`/`LoggingOut…`, `ApplicationCredentials`, `MCP`, `ChatCompletion`, and `common` `Add`, `Cancel`, `CloseDialog`, `ClearSearch`, `ToolsetSignInFailed`, plus the status keys used by `getEntityStatusMessage`.

**Removed after a repo-wide search:** `AgentsAndToolsets`, `SelectAgentsAndToolsets`, `SelectedLabel`, `NoResourcesSelected`, `MyFavorites`, `CatalogTab`, `NoFavoritesYet`, `SearchPlaceholder` (if unused), and `common` `AddAgentsAndToolsets`, `NoAgentsAndToolsetsAdded`, `ModelEntityType`/`AgentEntityType`/`ToolsetEntityType`, `Details`, `LoggedOutToolsetClickHint`.

### D11. RTL

- Row items reuse the Skills classes (`flex items-center gap-*`, `text-start`, `pe-1`).
- The badge uses the catalog's bottom-end placement, a logical inset.
- The header action row is `flex gap-2`, and the Tools list rows are `text-start`.
- No physical `ml/mr/pl/pr/left/right`.
- The catalog list, `Popup` footer and `Tabs` already follow `dir`.
- No icon is mirrored: login, settings, key, trash, search, folder and × are all symmetric or non-directional.

### D12. Implementation notes (deviations found while applying)

- **Shared picker and popup shell.** Instead of two copies of `AddSkillsModal`, both pickers wrap `src/components/common/AddOnCatalogModal/AddOnCatalogModal.tsx` (labels, items, attached and initially-checked ids as props). Both details popups render `src/components/common/AddOnDetailsPopup/AddOnDetailsPopup.tsx`, a presentational shell (identity header + folder line in `EntityIdentity`'s `footer`, action row, banner, tabs, Delete/Close). It has no kind switch, so D2's rejected alternative still stands. `OverviewList` renders both Overview tabs. Skills keeps its own modal (follow-up in `docs/TECH_DEBT.md`).
- **Transport dialog owner.** `AgentDetailsPopup` mounts `DialAppConfigurationModal` itself, not `AgentsList`, so the popup stays mounted underneath and focus returns to Connection through the kit `Popup`.
- **Tools fetch owner.** `useToolsetTools` runs in `ToolsetDetailsPopup`, not in the Tools tab: the tab panel unmounts on a tab switch, and owning the state there refetched on every return to Tools.
- **Avatar badge.** `EntityIdentity` has no avatar slot, so the shell overlays a 40px box on the avatar, and `CredentialsBadge` places itself at that box's bottom-end corner. In the row, the badge sits inside the item's `aria-hidden` avatar and the status line carries its meaning through `aria-describedby`.
- **Deployment id.** Confirmed in task 1.3: the `deployment` path parameter is the toolset's canonical chat-api id (`encodeDialPath(id)`, the same form as `toolsetsApi` calls; chat's own example is `toolsets/ALS-OauthToolset-copy`). The generated client URL-encodes it once more.

## Risks / Trade-offs

- [The deployment-details `deployment` param may expect a different id form] → Resolved in task 1.3 (D12): the canonical chat-api toolset id. The error state with Retry still covers a failure.
- [`getDeploymentDetails` is slow, because it reaches the MCP server for `allToolNames`] → Fetched only on the Tools tab, with a spinner. chat-api caches for 60 s.
- [Partition misclassifies an exotic legacy entry] → `getAddOnKind` mirrors `getQuickApp2Toolsets`' own branches. Table-driven unit tests cover every branch, and save output is unchanged whatever the row, because the save mapping doesn't consult the row.
- [Losing name-sorted display] → Load still sorts, so this only affects order after an edit, as with Skills.
- [The `CredentialsBadge` import pulls the catalog bundle into the main chunk] → D8's lazy badge wrapper, verified by `npm run build`, with a local fallback.
- [`agentsAndToolsetsModal=1` consumers expected toolsets] → Open question below; it is a one-line switch either way.
- [Removing chip tooltips loses at-a-glance status] → The status line under the name and the badge carry it, and the popup banner carries the full text.

## Migration Plan

UI-only, with no data migration: `agentsAndToolsets` and the saved `tool_sets` are unchanged. It ships as one release, with no upstream dependency. Rollback: revert the change's commits.

## Open Questions

- Which picker should `agentsAndToolsetsModal=1` open? Default: Add agent (D9). Confirm with the host owners, and document the parameter in `host-integration` once confirmed (follow-up).
- Should an MCP agent's Tools be listed too? chat-api details carry tool names only for toolsets, so this is out of scope here.
