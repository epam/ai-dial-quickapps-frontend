## MODIFIED Requirements

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

**Tabs:** the catalog's details tabs and content, as defined by `catalog-entity-details`, for a catalog `CatalogItem` of type `Toolset`:

- About (listing description and topics);
- Overview, with the catalog's sections from the deployment details;
- Tools, with the catalog `ToolsTab` listing the allow-listed tools, or every tool the server reports when there is no allow-list.

The popup SHALL open on About. A tab whose data the details lack SHALL NOT be shown.

**Footer:**

- **Delete** (`quickAppEditor` `RemoveSkillFromApp`, "Delete") at the start edge: a danger, solid button with a leading trash icon.
- **Close** (`quickAppEditor` `Close`) at the end edge.

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
- **Tools:** `ToolsTab` with the tool definitions the catalog mapper builds from `allowedTools`, or from `allToolNames` when the allow-list is empty.

This app SHALL NOT build Overview rows or tool lists of its own.

#### Scenario: Overview from the details

- **WHEN** the details of `toolsets/public/figma` carry `owner: "Figma"`, `catalogProperties.provider: "Figma"` and OAuth authentication
- **THEN** Overview SHALL show a Specification section with Authentication, Provider "Figma" and Hosted by "Figma", labelled with the translated `quickAppEditor` keys

#### Scenario: Tools from the allow-list

- **WHEN** the details carry `allowedTools: ["edit_design"]` and three `allToolNames`
- **THEN** Tools SHALL list only `edit_design`

#### Scenario: No tools reported

- **WHEN** both tool lists are empty or absent
- **THEN** no Tools tab SHALL be shown

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

## REMOVED Requirements

### Requirement: Toolset Tools tab

**Reason**: The Tools tab is now the catalog's `ToolsTab`, fed by the catalog mapper from the same deployment-details response (see `catalog-entity-details` and "Toolset About and Overview tabs"). The editor's own searchable name list, its count and the `useToolsetTools` hook are dropped.

**Migration**: None for users. Tool names come from the same `GET /api/v1/deployments/{deployment}/details` call, which is now made when the popup opens rather than on first Tools selection.
