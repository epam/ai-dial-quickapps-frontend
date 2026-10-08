# Spec Delta

## MODIFIED Requirements

### Requirement: Toolset details popup

Activating a Toolsets row item SHALL open a modal dialog (ui-kit `Popup`, `PopupSize.Lg`) for that toolset.

**Header:** the catalog `DetailsHeader` from `@epam/ai-dial-catalog`, as `catalog-entity-details` specifies: the icon, the type caption from `quickAppEditor` key `ToolsetTypeLabel` ("Toolset"), the name and the version, and the folder path; plus a close (×) control labelled by `common` `CloseDialog`. The popup avatar SHALL NOT carry the logged-out badge; the row item keeps it.

The dialog's accessible name SHALL be the toolset name.

**Credentials action:** the `DetailsHeader` credentials action, shown only in an editable application when the toolset needs authentication:

- OAuth, signed out: **Log in** (`quickAppEditor` `LoginToolsetAction`); signed in: **Log out** (`LogoutToolsetAction`).
- API key, no key: **API key** (`ApiKeyLabel`); key on file: **Change API key** (`ToolsetChangeApiKeyAction`). Both open the catalog personal API-key popover to add or delete the key.

**Status banner.** When the toolset is logged out, the `getEntityStatusMessage` text SHALL be shown above the tabs.

**Tabs:** the catalog's details tabs and content, as defined by `catalog-entity-details`, for a catalog `CatalogItem` of type `Toolset`:

- About (listing description and topics);
- Overview, with the catalog's sections from the deployment details;
- Tools, with the catalog `ToolsTab` listing the allow-listed tools, or every tool the server reports when there is no allow-list.

The popup SHALL open on About. A tab whose data the details lack SHALL NOT be shown.

**Footer:**

- **Delete** (`quickAppEditor` `RemoveSkillFromApp`, "Delete") at the start edge: a danger, outlined button with a leading trash icon.
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

### Requirement: Toolset login from the details popup

The `DetailsHeader` credentials action SHALL start the existing sign-in flows, through `useToolsetCredentials` (`src/hooks/use-toolset-credentials.ts`). The flows themselves SHALL NOT change:

- **OAuth Log in:** post `{ type: REQUEST_TOOLSET_LOGIN, toolsetId }` to the host (`postToHost`). As in the catalog, the action shows no in-progress state for OAuth.
  - On a matching `TOOLSET_LOGIN_RESULT` with `success: true`, the popup SHALL apply it with `DataContext.applyToolsetAuthResult`.
  - On `success: false`, it SHALL show `common` `ToolsetSignInFailed`.
- **OAuth Log out:** the same with `REQUEST_TOOLSET_LOGOUT` / `TOOLSET_LOGOUT_RESULT`, started directly from the action (`onRequestLogout`), with no confirmation step.
- **API key add / delete:** the catalog personal API-key popover calls `toolsetsApi.loginToolset` (with the key) / `logoutToolset`, at the credentials level `USER` for a public toolset and `GLOBAL` otherwise, then `refreshToolsets`. A failure SHALL show `ToolsetSignInFailed`.

After a successful result, the details popup SHALL stay open. Its header action and the row item's badge SHALL reflect the new status from `DataContext`. Messages from origins outside `allowedOrigins`, and results for other toolset ids, SHALL be ignored. Read-only and shared applications SHALL NOT render the credentials action.

#### Scenario: OAuth login succeeds

- **WHEN** the user activates Log in for signed-out OAuth toolset Figma and the host replies `TOOLSET_LOGIN_RESULT { toolsetId: "toolsets/public/figma", success: true }`
- **THEN** exactly one `REQUEST_TOOLSET_LOGIN` for that id SHALL have been posted
- **AND** the action SHALL become Log out, and the badge SHALL disappear from the row item

#### Scenario: OAuth login fails

- **WHEN** the host replies with `success: false`
- **THEN** the popup SHALL show "Failed to update toolset credentials" and Log in SHALL be enabled again

#### Scenario: API key toolset

- **WHEN** the user activates API key for a signed-out API-key toolset and adds a key
- **THEN** `POST /api/v1/toolsets/{name}/login` SHALL be called with that key, as today
