# Spec Delta

## MODIFIED Requirements

### Requirement: Toolset login from the details popup

The `DetailsHeader` credentials action SHALL start the existing sign-in flows, through `useToolsetCredentials` (`src/hooks/use-toolset-credentials.ts`). The flows themselves SHALL NOT change:

- **OAuth Log in:** post `{ type: REQUEST_TOOLSET_LOGIN, toolsetId }` to the host (`postToHost`). As in the catalog, the action shows no in-progress state for OAuth.
  - On a matching `TOOLSET_LOGIN_RESULT` with `success: true`, the popup SHALL apply it with `DataContext.applyToolsetAuthResult`.
  - On `success: false`, nothing SHALL change: the action stays Log in.
- **OAuth Log out:** the same with `REQUEST_TOOLSET_LOGOUT` / `TOOLSET_LOGOUT_RESULT`, started directly from the action (`onRequestLogout`), with no confirmation step.
- **API key add / delete:** the catalog personal API-key popover calls `toolsetsApi.loginToolset` (with the key) / `logoutToolset`, at the credentials level `USER` for a public toolset and `GLOBAL` otherwise, then `refreshToolsets`. A failed request SHALL leave the status unchanged.

After a successful result, the details popup SHALL stay open. Its header action and the row item's badge SHALL reflect the new status from `DataContext`. Messages from origins outside `allowedOrigins`, and results for other toolset ids, SHALL be ignored.

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

**Delete** in the toolset details popup SHALL remove that id from `addOns` and close the popup. It SHALL NOT call any chat-api toolset mutation.

#### Scenario: Delete detaches the toolset

- **WHEN** an editable application has `[A1, T1, T2]` and the user activates Delete in `T1`'s popup
- **THEN** `addOns` SHALL become `[A1, T2]`, the form SHALL become dirty, and the popup SHALL close
- **AND** no request to `/api/v1/toolsets` SHALL have been made

#### Scenario: Deleting the last toolset

- **WHEN** the user deletes the only attached toolset
- **THEN** the Toolsets row SHALL show its empty-state description again, and the Agents row SHALL be unchanged

## REMOVED Requirements

### Requirement: Attached toolsets list

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

### Requirement: Add toolset popup

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

## ADDED Requirements

### Requirement: Attached toolsets list (editable)

The Toolsets row of the Add-ons card SHALL list the attached toolsets in `addOns` order. Each item SHALL show:

- the avatar: `DeploymentIcon` from `@epam/ai-dial-chat-shared` with the toolset's `iconUrl`, falling back to the name's initials;
- the name: `getLocalizedText(name, language)`, falling back to the id's last segment without version;
- the version as secondary text, only when one is known.

**Logged-out badge.** When the toolset needs authentication (`authSettings.authenticationType` is not `NONE`) and `authSettings.authStatus` is not `SIGNED_IN`, the avatar SHALL carry the catalog `CredentialsBadge` from `@epam/ai-dial-catalog`. Its label SHALL be `CatalogI18nKeys.CredentialsBadgeLoggedOut` ("Authorize to use this toolset.").

**Status line.** Below the name, the item SHALL show the status text from `getEntityStatusMessage` (read-only wording) when the toolset is logged out or is not found in the catalog.

**Details button.** Each item SHALL hold a button named by `ApplicationEditorI18nKeys.AddOnsDetails` with `{{name}}` (e.g. "Figma details"). Activating it SHALL open the toolset details popup.

**Remove button.** Each item SHALL also hold a remove button at its end: a ui-kit ghost icon button with a trash icon, named by `ApplicationEditorI18nKeys.AddOnsRemove` with `{{name}}`. It SHALL be visible only while the item is hovered or holds keyboard focus (`:focus-visible`), and SHALL stay in the tab order. Focus that returns to the item after a popup is closed with the mouse SHALL NOT reveal it. Activating it SHALL remove that id from `addOns` without opening the popup, and SHALL move focus to the first remaining item in the row.

**Not rendered.** Items SHALL NOT render a chip box, a tooltip or a configure (gear) button.

**Data.** The list SHALL be read from `DataContext` and SHALL make no chat-api request of its own. The item component SHALL be shared with the Skills and Agents rows. The open popup id SHALL be local `useState` in the list component; no new context SHALL be introduced.

#### Scenario: Toolsets are listed

- **WHEN** an application loads with toolsets Figma (version `1.0.0`, signed out, OAuth) and Jira (no auth)
- **THEN** the Toolsets row SHALL show Figma with "1.0.0" and the logged-out badge, and Jira without a badge
- **AND** each item SHALL have a "Remove <name>" button that is hidden until the item is hovered or focused

#### Scenario: Toolset missing from the catalog

- **WHEN** an attached id `toolsets/public/old-tool` is not in `toolsetsMap`
- **THEN** its item SHALL show "old-tool" and the `ApplicationEditorI18nKeys.AddOnsUnavailableRemovalRequired` status text
- **AND** activating it SHALL open the details popup in its unavailable state

#### Scenario: Remove button hides after the details popup is closed with the mouse

- **WHEN** the user clicks an attached toolset to open its details popup, closes the popup with the mouse (header close control or Close) and the pointer is no longer over the item
- **THEN** the item's "Remove <name>" button SHALL be hidden, even though focus returned to the item's details button
- **AND** if the popup is closed with the keyboard, the button SHALL be visible while the details button holds that keyboard focus

#### Scenario: Remove from the row

- **WHEN** an editable application has toolsets `[T1, T2]` and the user activates the trash button of `T1`
- **THEN** `T1` SHALL be removed from `addOns`, the form SHALL become dirty, and focus SHALL move to `T2`'s details button
- **AND** the details popup SHALL NOT open

### Requirement: Add toolset popup (editable)

The Toolsets row's Add action SHALL open the **Add toolset** popup. It SHALL match the Add skill popup (`skills_catalog` "Add skill popup catalog list", "… search, filter and sort", "… multi-selection", "… loading and error states") with these differences:

- **Rows:** title `ApplicationEditorI18nKeys.ToolsetsAdd` ("Add toolset"); heading `ApplicationEditorI18nKeys.ToolsetsCatalogTitle` ("Toolsets catalog"); search placeholder and name `ApplicationEditorI18nKeys.ToolsetsSearchPlaceholder` ("Search toolsets...").
- **Content:** the rows are `DataContext.toolsets` without hidden-folder ids and without the application being edited, mapped by `mapToolsetToCatalogItem`. The mapping SHALL carry `credentials`, so `ListView` shows the logged-out badge with the `CatalogI18nKeys.CredentialsBadgeLoggedOut` label.
- **List:** `ListView` uses `type={CatalogEntityType.Toolset}`, `CatalogSelectionMode.Multiple` and `isReadonly` (no Favorite column).
- **Checkbox names:** row checkboxes use `ApplicationEditorI18nKeys.AddOnsSelect` ("Select {{name}}") and select-all uses `ApplicationEditorI18nKeys.ToolsetsSelectAll`.
- **States:** the loading label is `ApplicationEditorI18nKeys.ToolsetsLoading`, the error title `ApplicationEditorI18nKeys.ToolsetsLoadError`, and the empty-catalog title `ApplicationEditorI18nKeys.ToolsetsEmpty`.
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
