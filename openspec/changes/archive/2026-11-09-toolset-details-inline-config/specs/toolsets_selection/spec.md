## MODIFIED Requirements

### Requirement: Toolset details popup

Activating a Toolsets row item SHALL open a modal dialog (ui-kit `Popup`, `PopupSize.Lg`) for that toolset.

**Header:** the catalog `DetailsHeader` from `@epam/ai-dial-catalog`, as `catalog-entity-details` specifies: the icon, the type caption from `ApplicationEditorI18nKeys.ToolsetsTypeLabel` ("Toolset"), the name and the version, and the folder path; plus a close (×) control labelled by `BasicI18nKeys.CloseDialog`. The popup avatar SHALL NOT carry the logged-out badge; the row item keeps it.

The dialog's accessible name SHALL be the toolset name.

**Credentials action:** the `DetailsHeader` credentials action, shown only in an editable application when the toolset needs authentication:

- OAuth, signed out: **Log in** (`ButtonsI18nKeys.LogIn`); signed in: **Log out** (`ButtonsI18nKeys.LogOut`).
- API key, no key: **API key** (`ToolsetSigninI18nKeys.ApiKeyLabel`); key on file: **Change API key** (`CatalogI18nKeys.CredentialsChangeApiKeyActionLabel`). Both open the catalog personal API-key popover to add or delete the key.

The popup SHALL show no status banner and no sign-in error line: the logged-out state is the header's Log in action, as in the catalog.

**Tabs:** the catalog's details tabs and content, as defined by `catalog-entity-details`, for a catalog `CatalogItem` of type `Toolset`:

- About (listing description and topics);
- Overview, with the catalog's sections from the deployment details;
- Tools, with the catalog `ToolsTab` listing the allow-listed tools, or every tool the server reports when there is no allow-list.

The popup SHALL open on About. A tab whose data the details lack SHALL NOT be shown.

**Footer:**

- **Delete** (`ButtonsI18nKeys.Delete`, "Delete") at the start edge: a danger, outlined button with a leading trash icon.
- **Close** (`ButtonsI18nKeys.Close`) at the end edge.

`DetailsHeader` SHALL show no other action: no Use in chat, Share, Publish, Edit, Download or Manage menu.

**Entries without a catalog entity.** An attached toolset that is not in `toolsetsMap` SHALL be resolved into exactly one of two cases, by the same rule the Toolsets row uses for its status line:

- **Inline:** its id is not a `toolsets/…` or `applications/…` id and the entry carries its own saved config (a toolset defined in the application's JSON, e.g. a REST API toolset). It is available and working, so the popup SHALL NOT call it unavailable.
- **Not found:** its id is a `toolsets/…` or `applications/…` id that is missing from the catalog once the catalog has loaded. The toolset was deleted or hidden.

For an **Inline** entry the popup SHALL show the entry name as the header name, the "Toolset" caption and the empty-scope folder line, no version and no credentials action. Its only tab SHALL be **Tools**, listing each tool declared in the saved config's `tools` (name, description and input parameters with their JSON type and required flag), shown from the moment the popup opens. No chat-api request SHALL be made. When the config declares no tools, the content SHALL show `ApplicationEditorI18nKeys.ToolsetsInlineNoDetails` ("This toolset is defined in the application's JSON configuration and has no catalog details.") in place of the tabs.

The popup SHALL be loaded with `React.lazy`, because it imports from `@epam/ai-dial-catalog`.

#### Scenario: Popup opens on About

- **WHEN** the user activates the Figma item and its details load
- **THEN** a dialog named "Figma" SHALL be displayed with the "Toolset" caption, "1.0.0", the About, Overview and Tools tabs, About selected, and Delete and Close in the footer

#### Scenario: Close

- **WHEN** the user activates Close or ×, presses Escape, or clicks outside the dialog
- **THEN** the popup SHALL close, `addOns` SHALL be unchanged, and focus SHALL return to the item that opened it

#### Scenario: Toolset unavailable

- **WHEN** the popup opens for an attached `toolsets/public/old-tool` that is not in `toolsetsMap`
- **THEN** the header SHALL show the fallback name, and the content SHALL show `ApplicationEditorI18nKeys.ToolsetsUnavailable` ("This toolset is no longer available") in place of the tabs
- **AND** no chat-api request SHALL be made, no credentials action SHALL be shown, and Delete SHALL still be offered in an editable application

#### Scenario: Inline REST API toolset with tools

- **WHEN** the saved `tool_sets` holds a `rest-api` toolset named "Weather rest-api toolset" with one tool `weather` (description "To get current weather for geo coordinates (lat, lon)", required parameters `latitude` and `longitude`), and the user activates its item
- **THEN** a dialog named "Weather rest-api toolset" SHALL be displayed with a Tools tab listing `weather`, its description, and `latitude` and `longitude` as required numbers
- **AND** the text "This toolset is no longer available" SHALL NOT be shown, no chat-api request SHALL be made, and Delete and Close SHALL be offered

#### Scenario: Inline toolset without tools

- **WHEN** the user activates an attached inline toolset whose saved config has `tools: []`
- **THEN** the content SHALL show the inline-toolset message and no tabs
- **AND** Delete SHALL still detach the entry

#### Scenario: Row and popup agree

- **WHEN** an attached item shows no error status in the Toolsets row because it is an inline toolset
- **THEN** its details popup SHALL NOT show the not-found message
