## Why

The Add-ons card still has one merged **Agents & Toolsets** row. It shows a bordered box of removable chips with hover tooltips and a hover gear (`src/components/common/AgentAndToolsetSelector/AgentAndToolsetSelector.tsx:57-77`, `AgentAndToolsetChip.tsx:156-177`). Picking happens in a card grid with My Favorites / Catalog tabs and a "Selected" strip (`AgentAndToolsetModal.tsx:209-293`). Skills were just redesigned into a list, a catalog-list picker and a details popup (`openspec/specs/skills_catalog/spec.md`). The new mock applies the same pattern to separate **Toolsets** and **Agents** rows:

- the toolset popup has About / Overview / Tools tabs and a Log in button;
- a logged-out toolset shows a warning badge on its avatar;
- the Agents row is described as "Sub-agents this agent can delegate tasks to."

Today a user can't see which tools a toolset exposes, and a toolset's sign-in state shows only as a red chip.

`docs/TECH_DEBT.md` ("Add-ons: … splits Agents & Toolsets into separate Toolsets and Agents rows … Needs its own OpenSpec change") already tracks this.

## What Changes

- **Two rows instead of one.** The Add-ons card gets a **Toolsets** row and an **Agents** row in place of Agents & Toolsets. Skills stays first, Conversation starters last. Both rows read and write the existing `agentsAndToolsets` form value. Each row shows and edits only its own kind and leaves the other kind's entries as they are.
  - **Toolsets:** entries whose entity is a toolset (`type: 'toolset'`), a `toolsets/…` id missing from the catalog, or an inline toolset config without a `deployment_id`.
  - **Agents:** applications (including MCP-only agents) and models, i.e. everything that is not a toolset. Per your decision, models stay in the Agents row, so nothing that can be picked today is lost.
- **Row list (both rows).** The same list as Skills: avatar (the entity icon, or initials when it has none), name, and the version when there is one.
  - Each item opens the details popup.
  - A trash button appears on hover or focus in an editable app.
  - A logged-out toolset shows the catalog `CredentialsBadge` on its avatar.
  - An unavailable entry (not in the catalog), an undeployed agent and a logged-out toolset show a status line under the name.
  - The chip box, the chip tooltip and the hover gear are removed.
- **Add toolset / Add agent popups.** They replace the shared card-grid modal and mirror the Add skill popup:
  - heading with a count, sort, search and the catalog **From** filter;
  - catalog `ListView` in multi-select mode;
  - **Add** commits the checked set, and **Cancel**/×/Escape discard it.
  - The Toolsets popup lists toolsets only. The Agents popup lists applications, MCP agents and models. The app being edited is excluded, as today.
  - **BREAKING (UI only):** the My Favorites tab and the "Selected" strip are removed.
- **Toolset details popup** (new). The header has the avatar (with the badge), a "Toolset" caption, the name, the version and the folder path. Below the header there is a **Log in** / **Log out** button when the toolset needs authentication.
  - **About:** the description and topics.
  - **Overview:** listing metadata — Authentication, Folder, Updated, Version.
  - **Tools:** a search field, the tool count and the tool names, fetched from chat-api deployment details only while the tab is open.
  - **Footer:** **Delete** detaches the toolset from the app. **Close**.
  - Log in reuses today's flows: OAuth through the host's `REQUEST_TOOLSET_LOGIN`, API keys through `toolsetsApi.loginToolset`.
- **Agent details popup** (new). Same header with an "Agent" or "Model" caption. Below the header, per your decision, it shows **Connection** (MCP / Chat completion transport, today's gear dialog) for MCP-capable applications. It also shows **Credentials** (the host's application credential forms) when `applicationCredentials=true` and the app needs authentication. There is no hover gear any more.
  - **About:** the description and topics.
  - **Overview:** Folder, Updated, Version and deployment status.
  - **Footer:** Delete and Close, as for toolsets.
- **Deleted:** `src/components/common/AgentAndToolsetSelector/**` (chip, tooltip, card modal, info modal, selector) and `src/components/ContextAndTools/AgentsAndToolsetsField.tsx`. `ToolsetLoginModal` (API key form) and `DialAppConfigurationModal` are kept and re-parented.

## Non-goals

- A Knowledge base row (also in the mock). It needs its own change.
- Changing what is saved: the `agentsAndToolsets` form value, `tool_sets` serialization (`src/form/quickApp2Form.ts:327-433`) and their order rules stay the same.
- Editing a toolset's allowed tools, or showing tool descriptions and input schemas. chat-api's details response carries names only (`ToolsetDetailsDto.allowedTools` / `allToolNames`).
- Admin credential management (organization-level keys) or the catalog `DetailsPanel` slide-in. The mock is a centred popup like Skills.
- Favourites, sharing, publishing or deleting the DIAL resources themselves.
- Changing the host login/logout message protocol (`host-integration`).

## Alternatives considered

- _Keep one merged row and restyle it_ (conservative baseline). Smallest diff, but it contradicts the mock and the TECH_DEBT item. Rejected.
- _Catalog `DetailsPanel` for the details._ It already has About/Overview/Tools tabs and credentials (`node_modules/@epam/ai-dial-catalog/models/item-details-props.d.ts:513`). Rejected: it is a right-side slide-in, it brings publish/share/favourite surfaces the editor must switch off one by one, and it would look different from the skill popup the user just got. Its unexported `Tools` / `AboutTab` pieces can't be imported either (`index.d.ts` exports only `ContentTab` and `LimitsTab`).
- _Split the form value into `toolsets` and `agents`._ Cleaner types, but it changes `useQuickApp2Form`, the load/save mapping and their tests for no visible gain, and it raises the rollback risk. Rejected: the rows partition the one array instead.
- _Models in neither row_ (no new models). Rejected by product decision.
- _Keep the hover gear for agent configuration._ Rejected by product decision: actions live in the popup header, like the toolset's Log in.

## Acceptance criteria

- With one toolset and one application attached, the Add-ons card shows a Toolsets row with the toolset and an Agents row with the application. Each row shows avatar + name (+ version). A logged-out toolset carries the warning badge.
- Removing an item (trash or popup Delete) removes only that id from `agentsAndToolsets`. The other row and every other form value are unchanged. Saving writes the same `tool_sets` as removing the chip did before.
- **Add toolset** lists toolsets only, and **Add agent** lists applications, MCP agents and models, both without the app being edited. Attached entries are pre-checked. Add applies the checked set to that kind only and keeps the order rules. Cancel/Escape leave the form unchanged.
- The toolset popup shows About, Overview and Tools. Tools lists the tool names returned by `GET /api/v1/deployments/{id}/details` with search and a count, and shows loading, error (Retry) and empty states. Log in / Log out run the existing OAuth (host) and API-key flows, and the badge disappears after a successful login.
- The agent popup shows About and Overview. For an MCP-capable app, Connection opens the transport dialog, and saving it updates the entry's transport. Credentials appears only when `applicationCredentials=true` and the app needs authentication.
- Read-only or shared app: rows and popups open, but there is no trash, no Delete, no Log in/out, no Connection or Credentials, and Add is disabled.
- An inline toolset without a `deployment_id` is listed in Toolsets, opens in an unavailable state and is still saved unchanged.
- RTL: rows, pickers and popups run right to left. No icon is mirrored.

## Capabilities

### New Capabilities

- `toolsets_selection`: the Toolsets row (list, badge, remove), the Add toolset popup, and the toolset details popup with About / Overview / Tools and its Log in / Log out entry. This is the spec-id `docs/TECH_DEBT.md` proposes for this area. Login is kept here as the popup's entry point; the host round-trip itself stays in `host-integration` (a separate `toolsets_login` spec stays a candidate).
- `agents_selection`: the Agents row, the Add agent popup, and the agent details popup with About / Overview plus the Connection and Credentials actions.

### Modified Capabilities

- `application_editor-layout`: "Add-ons section groups add-on controls", "Agents and Toolsets content window is conditional", "Agents and Toolsets has no JSON view", "Add-ons follows the target visual hierarchy" and "Presentation change preserves form contract". The merged row becomes two rows over the same form value.

## Impact

- **Code:**
  - New `src/components/Toolsets/{ToolsetsList,AddToolsetsModal,ToolsetDetailsPopup}/`, `src/components/Agents/{AgentsList,AddAgentsModal,AgentDetailsPopup}/` and a shared row item and remove-focus logic extracted from `src/components/Skills/SkillsList/` (+ tests).
  - New utils: `src/utils/get-add-on-kind.ts` (partition), `src/utils/apply-catalog-selection.ts` (the selection rule generalised from `apply-skill-selection.ts`), `src/utils/map-toolset-to-catalog-item.ts`, `src/utils/map-agent-to-catalog-item.ts`.
  - New hook `src/hooks/use-toolset-tools.ts`.
  - Changed: `src/components/AddOns/AddOnsSection.tsx`, `src/utils/dialClient.ts` (`fetchToolsetToolNames`), `src/constants/quick-apps.ts` (the `?modal=1` query param now opens Add agent).
  - Deleted: `src/components/common/AgentAndToolsetSelector/**` except `ToolsetLoginModal.tsx` (moved), and `src/components/ContextAndTools/AgentsAndToolsetsField.tsx`.
- **API (chat-api):** one new read call, `deploymentsApi.getDeploymentDetails({ deployment })` (`GET /api/v1/deployments/{deployment}/details`), only while a toolset's Tools tab is open. Login/logout calls are unchanged (`toolsetsApi.loginToolset` / `logoutToolset`).
- **Auth / host integration (cross-cutting):** no protocol change. `REQUEST_TOOLSET_LOGIN`/`LOGOUT` and `REQUEST_APPLICATION_CREDENTIALS` are sent from new places (popup header buttons instead of the chip click and gear). The `?modal=1` deep link (`AgentsAndToolsetsModalQueryParams`) keeps opening a picker, now Add agent; see design D9.
- **Dependencies:** none new. `@epam/ai-dial-catalog` (installed `1.2.0-dev.310`) already has `ListView` multi-select and `CredentialsBadge`.
- **i18n:**
  - New `quickAppEditor` keys for the row titles and descriptions, the popup captions, tabs, Overview labels, Tools states, and the picker titles and aria labels (listed in the specs).
  - Reused: `Sort*`, `Filter*`, `NoResultsFound`, `Retry`, `Close`, `LoginToolsetAction`, `LogoutToolsetAction`, `ApplicationCredentials`, `common` `Add`/`Cancel`/`CloseDialog`/`ClearSearch`.
  - Removed: `AgentsAndToolsets`, `SelectAgentsAndToolsets`, `SelectedLabel`, `NoResourcesSelected`, `MyFavorites`, `CatalogTab`, `NoFavoritesYet`, `common` `AddAgentsAndToolsets`/`NoAgentsAndToolsetsAdded`, each only when a repo-wide search shows no other user.
- **RTL:** logical flex gaps only. The catalog list, `Popup` footer and `Tabs` follow `dir`. The `CredentialsBadge` sits at the avatar's bottom-end corner, so it flips with direction. No icon is mirrored.
- **Rollback:** revert the change's commits. The saved data shape is unchanged in both directions.
