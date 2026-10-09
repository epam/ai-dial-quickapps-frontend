# toolsets_selection Specification

## Purpose
Defines how the Quick App editor lists, inspects, signs into, removes and picks toolsets in the Toolsets row of the Add-ons card: the attached toolsets list (with the logged-out badge and a hover remove button), the toolset details popup (About, Overview and Tools tabs, Log in / Log out, and a Delete that detaches the toolset from the app only), and the Add toolset popup (catalog list with search, From filter, sort and multi-selection confirmed with Add). The toolsets are the toolset entries of the editor's `addOns` form value (owned by `useQuickApp2Form`), which it shares with `agents_selection`; toolset data comes from `DataContext`, and the popups keep their own UI state locally.
## Requirements
### Requirement: Toolset entries of the add-ons value

The Toolsets row SHALL show and edit only the toolset entries of the `addOns` form value (owned by `useQuickApp2Form`). An entry is a toolset entry when any of these holds:

- its entity in `DataContext.toolsetsMap` has `type: 'toolset'`, or it resolves to a toolset through the display-name index used today (`AgentsAndToolsetsField.tsx:55-61`);
- it has no entity and its id is a `toolsets/…` id (`isToolsetId`);
- it has no entity, no `deployment_id`, and is not a dial-deployment tool (an inline toolset config saved by the removed JSON editor).

Every other entry belongs to the Agents row (`agents_selection`). The classification SHALL be the pure util `getAddOnKind` (`src/utils/get-add-on-kind.ts`), which returns the string enum `AddOnKind` (`Toolset`, `Agent`) from `src/types/add-on-kind.ts`.

Each edit made from the Toolsets row SHALL change only toolset entries. Agent entries SHALL keep their values and their positions in the array. The form value's shape, the `tool_sets` save mapping (`buildQuickApp2Config`) and the per-entry tool data SHALL NOT change.

#### Scenario: Mixed value is partitioned

- **WHEN** `addOns` holds `toolsets/public/figma` (a toolset), `applications/public/research-agent` (an application) and `gpt-4o` (a model), in that order
- **THEN** the Toolsets row SHALL list only Figma
- **AND** the Agents row SHALL list the research agent and the model

#### Scenario: Inline toolset without a deployment id

- **WHEN** the saved `tool_sets` contains an MCP toolset config with `name: "jira"` and no `deployment_id`, and no catalog toolset has that display name
- **THEN** it SHALL be listed in the Toolsets row as "jira"
- **AND** saving without changes SHALL write the same inline config back to `tool_sets`

#### Scenario: Editing toolsets leaves agents untouched

- **WHEN** `addOns` is `[A1, T1, A2, T2]` (agents `A*`, toolsets `T*`) and the user removes `T1` from the Toolsets row
- **THEN** `addOns` SHALL become `[A1, A2, T2]`, and `A1` and `A2` SHALL keep their tool data (for example a configured `transport`)

### Requirement: Attached toolsets list

The Toolsets row of the Add-ons card SHALL list the attached toolsets in `addOns` order. Each item SHALL show:

- the avatar: `DeploymentIcon` from `@epam/ai-dial-chat-shared` with the toolset's `iconUrl`, falling back to the name's initials;
- the name: `getLocalizedText(name, language)`, falling back to the id's last segment without version;
- the version as secondary text, only when one is known.

**Logged-out badge.** When the toolset needs authentication (`authSettings.authenticationType` is not `NONE`) and `authSettings.authStatus` is not `SIGNED_IN`, the avatar SHALL carry the catalog `CredentialsBadge` from `@epam/ai-dial-catalog`. Its label SHALL be `quickAppEditor` key `ToolsetLoggedOutBadge` ("Authorize to use this toolset.").

**Status line.** Below the name, the item SHALL show the status text from `getEntityStatusMessage` (read-only wording) when the toolset is logged out or is not found in the catalog.

**Details button.** Each item SHALL hold a button named by `quickAppEditor` key `AddOnDetails` with `{{name}}` (e.g. "Figma details"). Activating it SHALL open the toolset details popup.

**Remove button.** In an editable application, each item SHALL also hold a remove button at its end: a ui-kit ghost icon button with a trash icon, named by `quickAppEditor` key `RemoveAddOn` with `{{name}}`. It SHALL be visible only while the item is hovered or holds keyboard focus (`:focus-visible`), and SHALL stay in the tab order. Focus that returns to the item after a popup is closed with the mouse SHALL NOT reveal it. Activating it SHALL remove that id from `addOns` without opening the popup, and SHALL move focus to the first remaining item in the row. Read-only and shared applications SHALL NOT render it.

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

#### Scenario: Remove button hides after the details popup is closed with the mouse

- **WHEN** the user clicks an attached toolset to open its details popup, closes the popup with the mouse (header close control or Close) and the pointer is no longer over the item
- **THEN** the item's "Remove <name>" button SHALL be hidden, even though focus returned to the item's details button
- **AND** if the popup is closed with the keyboard, the button SHALL be visible while the details button holds that keyboard focus

#### Scenario: Remove from the row

- **WHEN** an editable application has toolsets `[T1, T2]` and the user activates the trash button of `T1`
- **THEN** `T1` SHALL be removed from `addOns`, the form SHALL become dirty, and focus SHALL move to `T2`'s details button
- **AND** the details popup SHALL NOT open

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** toolsets SHALL still be listed and SHALL still open the details popup
- **AND** no remove button SHALL be rendered

### Requirement: Toolset details popup

Activating a Toolsets row item SHALL open a modal dialog (ui-kit `Popup`, `PopupSize.Lg`) for that toolset.

**Header:** the catalog `DetailsHeader` from `@epam/ai-dial-catalog`, as `catalog-entity-details` specifies: the icon, the type caption from `quickAppEditor` key `ToolsetTypeLabel` ("Toolset"), the name and the version, and the folder path; plus a close (×) control labelled by `common` `CloseDialog`. The popup avatar SHALL NOT carry the logged-out badge; the row item keeps it.

The dialog's accessible name SHALL be the toolset name.

**Credentials action:** the `DetailsHeader` credentials action, shown only in an editable application when the toolset needs authentication:

- OAuth, signed out: **Log in** (`quickAppEditor` `LoginToolsetAction`); signed in: **Log out** (`LogoutToolsetAction`).
- API key, no key: **API key** (`ApiKeyLabel`); key on file: **Change API key** (`ToolsetChangeApiKeyAction`). Both open the catalog personal API-key popover to add or delete the key.

The popup SHALL show no status banner and no sign-in error line: the logged-out state is the header's Log in action, as in the catalog.

**Tabs:** the catalog's details tabs and content, as defined by `catalog-entity-details`, for a catalog `CatalogItem` of type `Toolset`:

- About (listing description and topics);
- Overview, with the catalog's sections from the deployment details;
- Tools, with the catalog `ToolsTab` listing the allow-listed tools, or every tool the server reports when there is no allow-list.

The popup SHALL open on About. A tab whose data the details lack SHALL NOT be shown.

**Footer:**

- **Delete** (`quickAppEditor` `RemoveAddOnFromApp`, "Delete") at the start edge: a danger, outlined button with a leading trash icon.
- **Close** (`quickAppEditor` `Close`) at the end edge.

`DetailsHeader` SHALL show no other action: no Use in chat, Share, Publish, Edit, Download or Manage menu.

The popup SHALL be loaded with `React.lazy`, because it imports from `@epam/ai-dial-catalog`.

#### Scenario: Popup opens on About

- **WHEN** the user activates the Figma item and its details load
- **THEN** a dialog named "Figma" SHALL be displayed with the "Toolset" caption, "1.0.0", the About, Overview and Tools tabs, About selected, and Delete and Close in the footer

#### Scenario: Close

- **WHEN** the user activates Close or ×, presses Escape, or clicks outside the dialog
- **THEN** the popup SHALL close, `addOns` SHALL be unchanged, and focus SHALL return to the item that opened it

#### Scenario: Toolset unavailable

- **WHEN** the popup opens for an attached toolset that is not in `toolsetsMap`
- **THEN** the header SHALL show the fallback name, and the content SHALL show `quickAppEditor` `ToolsetUnavailable` ("This toolset is no longer available") in place of the tabs
- **AND** no chat-api request SHALL be made, no credentials action SHALL be shown, and Delete SHALL still be offered in an editable application

### Requirement: Toolset About and Overview tabs

The toolset's **About**, **Overview** and **Tools** content SHALL be the catalog's, as defined by `catalog-entity-details`:

- **About:** `AboutTab` with the listing `description` and `topics`, shown from the moment the popup opens.
- **Overview:** `OverviewTab` with the sections `mapEntityDetailsToCatalogDetails` builds from `toolsetDetails`. These are Capabilities (from `features`) and Specification: authentication, provider, vendor, license, knowledge cutoff, parameters, hosted by (`owner`) and creation date, each only when present.
- **Tools:** `ToolsTab` with the tool definitions the catalog mapper builds from `allowedTools`, or from `allToolNames` when the allow-list is empty. Above the list, the catalog renders a search field and the number of tools shown. The search filters by tool name or description, ignoring case. When nothing matches, the tab shows a no-results text.

This app SHALL NOT build Overview rows, tool lists or tool filtering of its own. The search query is local state inside the catalog's `ToolsTab`, and no context or hook here owns it. No chat-api request is involved: the tab filters the tools already in the loaded details.

The Tools tab's strings come from `useCatalogDetailsLabels`' `tabs.tools`, memoised on the language with the other labels:

- search placeholder and accessible name: `quickAppEditor` → `Search tools...` (`QuickAppEditorI18nKeys.SearchTools`);
- clear button: `common` → `Clear search` (`CommonI18nKeys.ClearSearch`);
- count: `quickAppEditor` → `{{count}} tools` (`QuickAppEditorI18nKeys.ToolsCount`);
- no results: `quickAppEditor` → `No results found` (`QuickAppEditorI18nKeys.NoResultsFound`).

The catalog announces the count in a `role="status"` polite live region, so screen readers hear the result count while typing. The search field takes its accessible name from the placeholder, and its clear button is keyboard-reachable. RTL impact: none for this app. The layout and the field's icon are the catalog's, which uses logical properties, and no directional icon is added.

#### Scenario: Overview from the details

- **WHEN** the details of `toolsets/public/figma` carry `owner: "Figma"`, `catalogProperties.provider: "Figma"` and OAuth authentication
- **THEN** Overview SHALL show a Specification section with Authentication, Provider "Figma" and Hosted by "Figma", labelled with the translated `quickAppEditor` keys

#### Scenario: Tools from the allow-list

- **WHEN** the details carry `allowedTools: ["edit_design"]` and three `allToolNames`
- **THEN** Tools SHALL list only `edit_design`

#### Scenario: Tools count and search

- **WHEN** the user opens the Tools tab of a toolset with 27 tools
- **THEN** a "Search tools..." field and "27 tools" SHALL be shown above the list
- **AND** typing part of a tool's name SHALL narrow the list, and the count, to the matching tools
- **AND** a query that matches no tool SHALL show "No results found" and "0 tools"

#### Scenario: No tools reported

- **WHEN** both tool lists are empty or absent
- **THEN** no Tools tab SHALL be shown

### Requirement: Toolset login from the details popup

The `DetailsHeader` credentials action SHALL start the existing sign-in flows, through `useToolsetCredentials` (`src/hooks/use-toolset-credentials.ts`). The flows themselves SHALL NOT change:

- **OAuth Log in:** post `{ type: REQUEST_TOOLSET_LOGIN, toolsetId }` to the host (`postToHost`). As in the catalog, the action shows no in-progress state for OAuth.
  - On a matching `TOOLSET_LOGIN_RESULT` with `success: true`, the popup SHALL apply it with `DataContext.applyToolsetAuthResult`.
  - On `success: false`, nothing SHALL change: the action stays Log in.
- **OAuth Log out:** the same with `REQUEST_TOOLSET_LOGOUT` / `TOOLSET_LOGOUT_RESULT`, started directly from the action (`onRequestLogout`), with no confirmation step.
- **API key add / delete:** the catalog personal API-key popover calls `toolsetsApi.loginToolset` (with the key) / `logoutToolset`, at the credentials level `USER` for a public toolset and `GLOBAL` otherwise, then `refreshToolsets`. A failed request SHALL leave the status unchanged.

After a successful result, the details popup SHALL stay open. Its header action and the row item's badge SHALL reflect the new status from `DataContext`. Messages from origins outside `allowedOrigins`, and results for other toolset ids, SHALL be ignored. Read-only and shared applications SHALL NOT render the credentials action.

#### Scenario: OAuth login succeeds

- **WHEN** the user activates Log in for signed-out OAuth toolset Figma and the host replies `TOOLSET_LOGIN_RESULT { toolsetId: "toolsets/public/figma", success: true }`
- **THEN** exactly one `REQUEST_TOOLSET_LOGIN` for that id SHALL have been posted
- **AND** the action SHALL become Log out, and the badge SHALL disappear from the row item

#### Scenario: OAuth login fails

- **WHEN** the host replies with `success: false`
- **THEN** the popup SHALL show no error and the action SHALL stay Log in

#### Scenario: API key toolset

- **WHEN** the user activates API key for a signed-out API-key toolset and adds a key
- **THEN** `POST /api/v1/toolsets/{name}/login` SHALL be called with that key, as today

### Requirement: Remove a toolset from the application

**Delete** in the toolset details popup SHALL remove that id from `addOns` and close the popup. It SHALL NOT call any chat-api toolset mutation. In a read-only or shared application, Delete SHALL NOT be rendered.

#### Scenario: Delete detaches the toolset

- **WHEN** an editable application has `[A1, T1, T2]` and the user activates Delete in `T1`'s popup
- **THEN** `addOns` SHALL become `[A1, T2]`, the form SHALL become dirty, and the popup SHALL close
- **AND** no request to `/api/v1/toolsets` SHALL have been made

#### Scenario: Deleting the last toolset

- **WHEN** the user deletes the only attached toolset
- **THEN** the Toolsets row SHALL show its empty-state description again, and the Agents row SHALL be unchanged

### Requirement: Add toolset popup

The Toolsets row's Add action SHALL open the **Add toolset** popup. It SHALL match the Add skill popup (`skills_catalog` "Add skill popup catalog list", "… search, filter and sort", "… multi-selection", "… loading and error states") with these differences:

- **Rows:** title `quickAppEditor` `AddToolset` ("Add toolset"); heading `ToolsetsCatalog` ("Toolsets catalog"); search placeholder and name `SearchToolsets` ("Search toolsets...").
- **Content:** the rows are `DataContext.toolsets` without hidden-folder ids and without the application being edited, mapped by `mapToolsetToCatalogItem`. The mapping SHALL carry `credentials`, so `ListView` shows the logged-out badge with the `ToolsetLoggedOutBadge` label.
- **List:** `ListView` uses `type={CatalogEntityType.Toolset}`, `CatalogSelectionMode.Multiple` and `isReadonly` (no Favorite column).
- **Checkbox names:** row checkboxes use `SelectAddOn` ("Select {{name}}") and select-all uses `SelectAllToolsets`.
- **States:** the loading label is `LoadingToolsets`, the error title `FailedToLoadToolsets`, and the empty-catalog title `NoToolsetsAvailable`.
- **Pre-check:** only the attached toolset ids start checked.
- **Add** SHALL apply `applyCatalogSelection(allIds, checkedIds, listedIds)` (`src/utils/apply-catalog-selection.ts`, generalised from `apply-skill-selection.ts`) to the full `addOns` id list:
  - kept entries and every agent entry stay in place, with their tool data;
  - unchecked listed toolsets are removed;
  - newly checked toolsets are appended in check order.

The popup state SHALL be local `useState`, reset on each open. The popup SHALL be loaded with `React.lazy`.

#### Scenario: Popup lists toolsets only

- **WHEN** the user activates Add in the Toolsets row and data has loaded
- **THEN** a dialog named "Add toolset" SHALL list toolsets only, with no models or applications, and with the logged-out badge on signed-out toolsets

#### Scenario: Confirm keeps agents

- **WHEN** `addOns` is `[A1, T1, T2]`, the user unchecks `T1`, checks `T3`, and activates Add
- **THEN** `addOns` SHALL become `[A1, T2, T3]` and `A1` SHALL keep its tool data

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** the Add action SHALL be disabled with the shared-application tooltip, and the popup SHALL NOT open

### Requirement: Toolsets accessibility and direction

The Toolsets row, the Add toolset popup and the toolset details popup SHALL be keyboard operable, SHALL expose translated names, and SHALL follow the document direction.

#### Scenario: Keyboard

- **WHEN** the details popup is open
- **THEN** focus SHALL be inside the dialog, and the tabs SHALL follow the ARIA tabs pattern (arrow keys move between the shown tabs)
- **AND** the credentials action, the tab panels, Delete and Close SHALL be reachable with Tab in reading order
- **AND** the badge SHALL expose its label to assistive technology

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** row items SHALL run avatar → name → version from right to left, with the trash button at the end (left)
- **AND** the badge SHALL sit at the avatar's bottom-end (bottom-left) corner
- **AND** in the popup Delete SHALL be at the start (right) and Close at the end (left)
- **AND** no icon SHALL be mirrored (avatar, badge, login, trash, search and × are not directional)

#### Scenario: Localization

- **WHEN** any of the three surfaces is rendered in a supported locale
- **THEN** every user-visible string SHALL come from the `quickAppEditor` or `common` keys named in this spec or in `catalog-entity-details`, and none SHALL be hardcoded

