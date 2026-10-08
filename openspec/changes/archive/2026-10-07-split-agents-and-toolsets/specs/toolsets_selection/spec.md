## ADDED Requirements

### Requirement: Toolset entries of the add-ons value

The Toolsets row SHALL show and edit only the toolset entries of the `agentsAndToolsets` form value (owned by `useQuickApp2Form`). An entry is a toolset entry when any of these holds:

- its entity in `DataContext.toolsetsMap` has `type: 'toolset'`, or it resolves to a toolset through the display-name index used today (`AgentsAndToolsetsField.tsx:55-61`);
- it has no entity and its id is a `toolsets/…` id (`isToolsetId`);
- it has no entity, no `deployment_id`, and is not a dial-deployment tool (an inline toolset config saved by the removed JSON editor).

Every other entry belongs to the Agents row (`agents_selection`). The classification SHALL be the pure util `getAddOnKind` (`src/utils/get-add-on-kind.ts`), which returns the string enum `AddOnKind` (`Toolset`, `Agent`) from `src/types/add-on-kind.ts`.

Each edit made from the Toolsets row SHALL change only toolset entries. Agent entries SHALL keep their values and their positions in the array. The form value's shape, the `tool_sets` save mapping (`buildQuickApp2Config`) and the per-entry tool data SHALL NOT change.

#### Scenario: Mixed value is partitioned

- **WHEN** `agentsAndToolsets` holds `toolsets/public/figma` (a toolset), `applications/public/research-agent` (an application) and `gpt-4o` (a model), in that order
- **THEN** the Toolsets row SHALL list only Figma
- **AND** the Agents row SHALL list the research agent and the model

#### Scenario: Inline toolset without a deployment id

- **WHEN** the saved `tool_sets` contains an MCP toolset config with `name: "jira"` and no `deployment_id`, and no catalog toolset has that display name
- **THEN** it SHALL be listed in the Toolsets row as "jira"
- **AND** saving without changes SHALL write the same inline config back to `tool_sets`

#### Scenario: Editing toolsets leaves agents untouched

- **WHEN** `agentsAndToolsets` is `[A1, T1, A2, T2]` (agents `A*`, toolsets `T*`) and the user removes `T1` from the Toolsets row
- **THEN** `agentsAndToolsets` SHALL become `[A1, A2, T2]`, and `A1` and `A2` SHALL keep their tool data (for example a configured `transport`)

### Requirement: Attached toolsets list

The Toolsets row of the Add-ons card SHALL list the attached toolsets in `agentsAndToolsets` order. Each item SHALL show:

- the avatar: `DeploymentIcon` from `@epam/ai-dial-chat-shared` with the toolset's `iconUrl`, falling back to the name's initials;
- the name: `getLocalizedText(name, language)`, falling back to the id's last segment without version;
- the version as secondary text, only when one is known.

**Logged-out badge.** When the toolset needs authentication (`authSettings.authenticationType` is not `NONE`) and `authSettings.authStatus` is not `SIGNED_IN`, the avatar SHALL carry the catalog `CredentialsBadge` from `@epam/ai-dial-catalog`. Its label SHALL be `quickAppEditor` key `ToolsetLoggedOutBadge` ("Authorize to use this toolset.").

**Status line.** Below the name, the item SHALL show the status text from `getEntityStatusMessage` (read-only wording) when the toolset is logged out or is not found in the catalog.

**Details button.** Each item SHALL hold a button named by `quickAppEditor` key `SkillDetails` with `{{name}}` (e.g. "Figma details"). Activating it SHALL open the toolset details popup.

**Remove button.** In an editable application, each item SHALL also hold a remove button at its end: a ui-kit ghost icon button with a trash icon, named by `quickAppEditor` key `RemoveSkill` with `{{name}}`. It SHALL be visible only while the item is hovered or holds keyboard focus, and SHALL stay in the tab order. Activating it SHALL remove that id from `agentsAndToolsets` without opening the popup, and SHALL move focus to the first remaining item in the row. Read-only and shared applications SHALL NOT render it.

**Not rendered.** Items SHALL NOT render a chip box, a tooltip or a configure (gear) button.

**Data.** The list SHALL be read from `DataContext` and SHALL make no chat-api request of its own. The item component SHALL be shared with the Skills and Agents rows. The open popup id SHALL be local `useState` in the list component; no new context SHALL be introduced.

#### Scenario: Toolsets are listed

- **WHEN** an application loads with toolsets Figma (version `1.0.0`, signed out, OAuth) and Jira (no auth)
- **THEN** the Toolsets row SHALL show Figma with "1.0.0" and the logged-out badge, and Jira without a badge
- **AND** each item SHALL have a "Remove <name>" button that is hidden until the item is hovered or focused

#### Scenario: Toolset missing from the catalog

- **WHEN** an attached id `toolsets/public/old-tool` is not in `toolsetsMap`
- **THEN** its item SHALL show "old-tool" and the `common` `UnavailableEntityRemovalRequired` status text
- **AND** activating it SHALL open the details popup in its unavailable state

#### Scenario: Remove from the row

- **WHEN** an editable application has toolsets `[T1, T2]` and the user activates the trash button of `T1`
- **THEN** `T1` SHALL be removed from `agentsAndToolsets`, the form SHALL become dirty, and focus SHALL move to `T2`'s details button
- **AND** the details popup SHALL NOT open

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** toolsets SHALL still be listed and SHALL still open the details popup
- **AND** no remove button SHALL be rendered

### Requirement: Toolset details popup

Activating a Toolsets row item SHALL open a modal dialog (ui-kit `Popup`, `PopupSize.Lg`) for that toolset.

**Header**, top to bottom:

- the avatar with the logged-out badge;
- a caption from `quickAppEditor` key `ToolsetTypeLabel` ("Toolset");
- the name and the version;
- the folder line (scope label and folder segments, as in the catalog Folder column);
- a close (×) control labelled by `common` `CloseDialog`.

The dialog's accessible name SHALL be the toolset name.

**Credentials action** (below the header): shown only in an editable application when the toolset needs authentication.

- When signed out: a primary button labelled `quickAppEditor` `LoginToolsetAction` ("Log in") with a leading login icon.
- When signed in: a ghost button labelled `LogoutToolsetAction` ("Log out").

**Status banner.** When the toolset is logged out, the `getEntityStatusMessage` text SHALL be shown above the tabs.

**Tabs:** ui-kit 2.0 `Tabs`, in this order, with the popup opening on About:

- **About** (`quickAppEditor` `AboutTab`);
- **Overview** (`SkillOverviewTab`);
- **Tools** (`ToolsTab`).

**Footer:**

- **Delete** (`quickAppEditor` `RemoveSkillFromApp`, "Delete") at the start edge: a danger, solid button with a leading trash icon.
- **Close** (`quickAppEditor` `Close`) at the end edge.

The popup SHALL be loaded with `React.lazy`, because it imports from `@epam/ai-dial-catalog`.

#### Scenario: Popup opens on About

- **WHEN** the user activates the Figma item
- **THEN** a dialog named "Figma" SHALL be displayed with the "Toolset" caption, "1.0.0", the About, Overview and Tools tabs, About selected, and Delete and Close in the footer

#### Scenario: Close

- **WHEN** the user activates Close or ×, presses Escape, or clicks outside the dialog
- **THEN** the popup SHALL close, `agentsAndToolsets` SHALL be unchanged, and focus SHALL return to the item that opened it

#### Scenario: Toolset unavailable

- **WHEN** the popup opens for an attached toolset that is not in `toolsetsMap`
- **THEN** the header SHALL show the fallback name, and each tab SHALL show `quickAppEditor` `ToolsetUnavailable` ("This toolset is no longer available")
- **AND** no chat-api request SHALL be made, no credentials action SHALL be shown, and Delete SHALL still be offered in an editable application

### Requirement: Toolset About and Overview tabs

The **About** tab SHALL render the listing `description` as Markdown (the same safe renderer the Skills Details tab uses) followed by the listing `topics` as tags. When there is no description, it SHALL show `quickAppEditor` `NoDescription`.

The **Overview** tab SHALL list label/value rows from the listing, omitting rows with no value:

- **Authentication** (`quickAppEditor` `DetailsAuthentication`): `AuthTypeOAuth` ("OAuth") or `ApiKeyLabel` ("API key"); omitted for `NONE`;
- **Folder** (`SkillFolder`): built by `getCatalogFolder`, joined with " / ";
- **Updated** (`SkillUpdated`): `updatedAt` as `Intl.DateTimeFormat(language, { dateStyle: 'medium' })`;
- **Version** (`SkillVersion`).

Neither tab SHALL make a chat-api request. The rows SHALL be built by a pure util in `src/utils/map-toolset-to-catalog-item.ts` and memoised with `useMemo`.

#### Scenario: Overview content

- **WHEN** the user selects Overview for `toolsets/public/figma` (OAuth, `updatedAt` 1759795200000, version `1.0.0`)
- **THEN** the tab SHALL show Authentication "OAuth", Folder "Organization", Updated as a localized date and Version "1.0.0"

### Requirement: Toolset Tools tab

The **Tools** tab SHALL list the names of the tools the toolset exposes:

- the allow-listed names (`toolsetDetails.allowedTools`) when that list is non-empty;
- otherwise every name the MCP server reports (`toolsetDetails.allToolNames`).

Layout, top to bottom:

- a search input (placeholder and accessible name `quickAppEditor` `SearchTools`, "Search...");
- the count of listed names (`quickAppEditor` `ToolsCount`, "{{count}} tools", pluralised);
- a list (`<ul>` named by `ToolsTab`) of names in response order, each on its own row.

Search SHALL filter case-insensitively on the trimmed query, and the count SHALL follow the filtered list.

**Fetch.**

- The details SHALL be fetched only once the Tools tab is first selected, and not again while the popup stays open.
- The call SHALL be `fetchToolsetToolNames(toolsetId, signal)` in `src/utils/dialClient.ts`, wrapping `deploymentsApi.getDeploymentDetails({ deployment: toolsetId })` from `@epam/ai-dial-chat-api-client`.
- The hook `useToolsetTools` (`src/hooks/use-toolset-tools.ts`) SHALL own the fetch state as a `ToolsStatus` string enum (`Idle`, `Loading`, `Ready`, `Error`). It SHALL abort on unmount and SHALL ignore a response that arrives after the popup closed or switched toolsets.

Request: `GET /api/v1/deployments/{deployment}/details`, where `deployment` is the toolset's canonical chat-api id (each segment percent-encoded, as for the other toolset calls), URL-encoded once more by the client.

Example, for toolset `toolsets/public/figma`:

```http
GET /api/v1/deployments/toolsets%2Fpublic%2Ffigma/details
```

```json
{
  "id": "toolsets/public/figma",
  "type": "toolset",
  "toolsetDetails": {
    "transport": "HTTP",
    "allowedTools": [],
    "allToolNames": ["evaluate_script", "get_design_context", "edit_design"],
    "authSettings": { "authenticationType": "OAUTH" }
  }
}
```

Rendered result: "3 tools" above the rows `evaluate_script`, `get_design_context`, `edit_design`.

#### Scenario: Tools load

- **WHEN** the user selects Tools for a toolset whose details return the payload above
- **THEN** the tab SHALL show "3 tools" and the three names in that order

#### Scenario: Allow-list wins

- **WHEN** the details return `allowedTools: ["edit_design"]` and three `allToolNames`
- **THEN** the tab SHALL show "1 tool" and only `edit_design`

#### Scenario: Search tools

- **WHEN** the user types "design" in the search box
- **THEN** only `get_design_context` and `edit_design` SHALL be listed and the count SHALL read "2 tools"
- **AND** when nothing matches, the list area SHALL show `quickAppEditor` `NoResultsFound`

#### Scenario: Tools loading and failure

- **WHEN** the request is pending
- **THEN** the tab SHALL show a spinner with accessible label `quickAppEditor` `LoadingTools`
- **WHEN** the request fails
- **THEN** the tab SHALL show `quickAppEditor` `FailedToLoadTools` and a Retry button (`quickAppEditor` `Retry`) that repeats the request, while About, Overview and the footer stay usable

#### Scenario: No tools reported

- **WHEN** both lists are empty or absent
- **THEN** the tab SHALL show `quickAppEditor` `NoToolsReported` ("This toolset reports no tools")

#### Scenario: About and Overview make no request

- **WHEN** the popup opens and the user never selects Tools
- **THEN** no request to `/api/v1/deployments/{deployment}/details` SHALL be made

### Requirement: Toolset login from the details popup

The details popup's credentials action SHALL start the existing sign-in flows. The flows themselves SHALL NOT change:

- **OAuth Log in:** post `{ type: REQUEST_TOOLSET_LOGIN, toolsetId }` to the host (`postToHost`). While it waits, the button SHALL show `LoggingInToolsetAction` and be disabled.
  - On a matching `TOOLSET_LOGIN_RESULT` with `success: true`, the popup SHALL apply it with `DataContext.applyToolsetAuthResult`.
  - On `success: false`, it SHALL show `common` `ToolsetSignInFailed`.
- **OAuth Log out:** the same with `REQUEST_TOOLSET_LOGOUT` / `TOOLSET_LOGOUT_RESULT` and `LoggingOutToolsetAction`.
- **API key Log in / Log out:** open the existing API-key popup (`ToolsetLoginModal`, moved to `src/components/Toolsets/ToolsetLoginModal/`). It calls `toolsetsApi.loginToolset` / `logoutToolset` and then `refreshToolsets`.

After a successful result, the details popup SHALL stay open. Its header, badge and action, and the row item's badge, SHALL reflect the new status from `DataContext`. Messages from origins outside `allowedOrigins`, and results for other toolset ids, SHALL be ignored. Read-only and shared applications SHALL NOT render the credentials action.

#### Scenario: OAuth login succeeds

- **WHEN** the user activates Log in for signed-out OAuth toolset Figma and the host replies `TOOLSET_LOGIN_RESULT { toolsetId: "toolsets/public/figma", success: true }`
- **THEN** exactly one `REQUEST_TOOLSET_LOGIN` for that id SHALL have been posted
- **AND** the button SHALL become Log out, and the badge SHALL disappear from the popup avatar and the row item

#### Scenario: OAuth login fails

- **WHEN** the host replies with `success: false`
- **THEN** the popup SHALL show "Failed to update toolset credentials" and Log in SHALL be enabled again

#### Scenario: API key toolset

- **WHEN** the user activates Log in for a signed-out API-key toolset
- **THEN** the API-key popup SHALL open over the details popup, and submitting a key SHALL call `POST /api/v1/toolsets/{name}/login` as today

### Requirement: Remove a toolset from the application

**Delete** in the toolset details popup SHALL remove that id from `agentsAndToolsets` and close the popup. It SHALL NOT call any chat-api toolset mutation. In a read-only or shared application, Delete SHALL NOT be rendered.

#### Scenario: Delete detaches the toolset

- **WHEN** an editable application has `[A1, T1, T2]` and the user activates Delete in `T1`'s popup
- **THEN** `agentsAndToolsets` SHALL become `[A1, T2]`, the form SHALL become dirty, and the popup SHALL close
- **AND** no request to `/api/v1/toolsets` SHALL have been made

#### Scenario: Deleting the last toolset

- **WHEN** the user deletes the only attached toolset
- **THEN** the Toolsets row SHALL show its empty-state description again, and the Agents row SHALL be unchanged

### Requirement: Add toolset popup

The Toolsets row's Add action SHALL open the **Add toolset** popup. It SHALL match the Add skill popup (`skills_catalog` "Add skill popup catalog list", "… search, filter and sort", "… multi-selection", "… loading and error states") with these differences:

- **Rows:** title `quickAppEditor` `AddToolset` ("Add toolset"); heading `ToolsetsCatalog` ("Toolsets catalog"); search placeholder and name `SearchToolsets` ("Search toolsets...").
- **Content:** the rows are `DataContext.toolsets` without hidden-folder ids and without the application being edited, mapped by `mapToolsetToCatalogItem`. The mapping SHALL carry `credentials`, so `ListView` shows the logged-out badge with the `ToolsetLoggedOutBadge` label.
- **List:** `ListView` uses `type={CatalogEntityType.Toolset}`, `CatalogSelectionMode.Multiple` and `isReadonly` (no Favorite column).
- **Checkbox names:** row checkboxes use `SelectSkill` ("Select {{name}}") and select-all uses `SelectAllToolsets`.
- **States:** the loading label is `LoadingToolsets`, the error title `FailedToLoadToolsets`, and the empty-catalog title `NoToolsetsAvailable`.
- **Pre-check:** only the attached toolset ids start checked.
- **Add** SHALL apply `applyCatalogSelection(allIds, checkedIds, listedIds)` (`src/utils/apply-catalog-selection.ts`, generalised from `apply-skill-selection.ts`) to the full `agentsAndToolsets` id list:
  - kept entries and every agent entry stay in place, with their tool data;
  - unchecked listed toolsets are removed;
  - newly checked toolsets are appended in check order.

The popup state SHALL be local `useState`, reset on each open. The popup SHALL be loaded with `React.lazy`.

#### Scenario: Popup lists toolsets only

- **WHEN** the user activates Add in the Toolsets row and data has loaded
- **THEN** a dialog named "Add toolset" SHALL list toolsets only, with no models or applications, and with the logged-out badge on signed-out toolsets

#### Scenario: Confirm keeps agents

- **WHEN** `agentsAndToolsets` is `[A1, T1, T2]`, the user unchecks `T1`, checks `T3`, and activates Add
- **THEN** `agentsAndToolsets` SHALL become `[A1, T2, T3]` and `A1` SHALL keep its tool data

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** the Add action SHALL be disabled with the shared-application tooltip, and the popup SHALL NOT open

### Requirement: Toolsets accessibility and direction

The Toolsets row, the Add toolset popup and the toolset details popup SHALL be keyboard operable, SHALL expose translated names, and SHALL follow the document direction.

#### Scenario: Keyboard

- **WHEN** the details popup is open
- **THEN** focus SHALL be inside the dialog, and the tabs SHALL follow the ARIA tabs pattern (arrow keys move between About, Overview and Tools)
- **AND** the credentials action, the Tools search, Delete and Close SHALL be reachable with Tab in reading order
- **AND** the badge SHALL expose its label to assistive technology

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** row items SHALL run avatar → name → version from right to left, with the trash button at the end (left)
- **AND** the badge SHALL sit at the avatar's bottom-end (bottom-left) corner
- **AND** in the popup Delete SHALL be at the start (right) and Close at the end (left)
- **AND** no icon SHALL be mirrored (avatar, badge, login, trash, search and × are not directional)

#### Scenario: Localization

- **WHEN** any of the three surfaces is rendered in a supported locale
- **THEN** every user-visible string SHALL come from the `quickAppEditor` or `common` keys named in this spec, and none SHALL be hardcoded
