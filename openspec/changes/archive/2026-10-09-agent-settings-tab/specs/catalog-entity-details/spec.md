## ADDED Requirements

### Requirement: App-owned tabs in add-on details popups

The shared details popup shell (`AddOnDetailsPopup`) SHALL accept app-owned tabs
through an optional `appTabs` prop. Each tab is an object with:

- `id`: a value of the string enum `AppDetailsTab` in `src/types/entity-details.ts`,
  currently `Settings = 'settings'`;
- `label`: an already translated label;
- `content`: the panel content.

The popup's tab type (`AddOnDetailsTab`) SHALL be `CatalogDetailsTab | AppDetailsTab`.

**Rendering:**

- **Order.** App-owned tabs SHALL be appended after the tabs the catalog helper
  returns, in the order given. The catalog tabs keep the catalog's own order.
- **Shared tab row.** They SHALL use the same tab row, ARIA tabs pattern and
  scrolling `tabpanel` as the catalog tabs.
- **Unavailable entity.** They SHALL NOT be rendered while the popup shows the
  unavailable state (`unavailableText` set, or no catalog item).
- **Selection.** If the selected tab disappears from the list, the first tab SHALL
  be selected. A tab that appears later SHALL NOT change the selection.

Only the agent details popup passes app-owned tabs today (`agents_selection` "Agent
Settings tab"). Skills and toolsets pass none, and their tabs are unchanged.

#### Scenario: App tab follows the catalog tabs

- **WHEN** the agent popup receives a Settings app tab for an application whose catalog tabs are About, Overview and Connect
- **THEN** the tab row SHALL read About, Overview, Connect, Settings with About selected

#### Scenario: Selecting an app tab

- **WHEN** the user selects Settings
- **THEN** the tab panel SHALL render the Settings content, labelled "Settings"

#### Scenario: No app tabs while unavailable

- **WHEN** the popup shows the unavailable state for an entity that would otherwise have a Settings tab
- **THEN** no tab row and no Settings content SHALL be rendered

## MODIFIED Requirements

### Requirement: Catalog tab content in add-on details popups

The skill, toolset and agent details popups SHALL render their tab row and tab panels with the DIAL catalog's own details components from `@epam/ai-dial-catalog`:

- `AboutTab`, `ContentTab`, `OverviewTab`, `PricingTab`, `LimitsTab`, `ToolsTab` and `ApiTab` (Connect);
- driven by a catalog `CatalogItem` whose `details` (`CatalogItemTabData`) comes from the catalog mappers.

Which tabs show, and in what order, SHALL be decided by the catalog's exported tab helper for that item, so the rule is the one `DetailsPanel` uses:

1. **About:** shown unless the item is content-first (skills).
2. **Details** (`ContentTab`): shown for skills.
3. **Overview:** shown when `details.overview` is present.
4. **Pricing:** shown when `details.pricing` is present.
5. **Limits:** shown when `details.limits` is present.
6. **Tools:** shown when `details.tools` is present.
7. **Connect** (`ApiTab`): shown when `details.api` names a connectable endpoint and the app settings carry `dialCoreExternalUrl`; hidden otherwise (`isConnectHidden`). Its section, field and copy labels SHALL be translated through `quickAppEditor` (`ConnectTab`, `ConnectResourceSection`, `ConnectSnippetSection`, `ConnectModelId`, `ConnectEndpoint` (also the endpoint section title), `ConnectRequestExample`, `ConnectResponseSchema`, `ConnectCopy`, and `MarkdownCopiedCode` for the copied status).

App-owned tabs ("App-owned tabs in add-on details popups") follow these, after
Connect.

The popup SHALL open on the first tab. The popup shell stays as specified by
`skills_catalog`, `toolsets_selection` and `agents_selection`: the catalog
`DetailsHeader` (identity, folder path, toolset credentials action), the agent
Credentials action, Delete and Close.

Tab-data state SHALL live in the popup, through the hook `useEntityDetails` (`src/hooks/use-entity-details.ts`) for skills, toolsets, agents and models alike. The hook wraps `useCatalogItemDetails` from `@epam/ai-dial-chat-hooks/catalog`, which dispatches skills to `useSkillItemDetails`. Switching tabs SHALL NOT refetch, and no new context SHALL be introduced. The catalog components SHALL be loaded with the popup through `React.lazy`.

#### Scenario: Toolset tabs follow the catalog

- **WHEN** the details popup opens for a toolset whose details response carries specification data and tool names
- **THEN** the tabs SHALL start with About, Overview, Tools, in that order, with About selected
- **AND** a Connect tab SHALL be shown last when `dialCoreExternalUrl` is set, with the toolset's MCP endpoint

#### Scenario: Model tabs follow the catalog

- **WHEN** the details popup opens for a model whose details carry pricing and whose limits response carries limits
- **THEN** the tabs SHALL be About, Overview, Pricing, Limits

#### Scenario: A tab without data is hidden

- **WHEN** an application's details response carries no pricing
- **THEN** no Pricing tab SHALL be shown for it

#### Scenario: Switching tabs does not refetch

- **WHEN** the user opens Overview, then About, then Overview again
- **THEN** the details SHALL have been requested once

#### Scenario: Connect hidden without a DIAL Core URL

- **WHEN** the app settings carry no `dialCoreExternalUrl`
- **THEN** no Connect tab SHALL be shown for any entity

### Requirement: Add-on details popups mirror the catalog details view

The skill, toolset and agent details popups SHALL keep the ui-kit `Popup` shell (Delete at the start, Close at the end of the footer) and SHALL lay out their content as the catalog `DetailsPanel` details view does, with the components it uses:

- **Header:** the catalog `DetailsHeader` from `@epam/ai-dial-catalog`: a 52 px icon, the type caption, the name with the version and the folder path, and the action row. The caption SHALL be translated per entity type through `texts.entityTypeLabels` (`SkillTypeLabel`, `ToolsetTypeLabel`, `AgentTypeLabel`, `Model`). `DetailsHeader` SHALL show only the toolset credentials action (`toolsets_selection`); Use in chat, Share, Publish, Edit, Download and the Manage menu SHALL be hidden.
- **Actions this app owns** (only the agent Credentials action) SHALL sit in a row
  under the header, where the catalog shows a toolset's Log in, indented by the icon
  width plus its gap (`ps-[60px]`). Settings this app owns live in app-owned tabs,
  not in this row.
- **Sections:** the tab row and the tab panel SHALL follow the header, separated by
  the catalog's 16 px gap.
- **Loading:** the loading indicator next to the tab row SHALL be the ui-kit `Skeleton` (one 72 px line) in a `role="status"` element labelled `quickAppEditor` `LoadingDetails`.
- **Markdown:** `AboutTab` and `ContentTab` SHALL receive `markdownLabels` translated through `quickAppEditor` (`MarkdownCopyCode`, `MarkdownCopiedCode`, `MarkdownDownloadCode`, `MarkdownTableScrollRegion`, `MarkdownMathScrollRegion`), so no catalog English default is shown.
- **Content files:** `ContentTab` SHALL receive the package files, the selection and the file-selector labels (`ContentFileSelectorAriaLabel`, `ContentFileCount`, `ContentFileLoading`, `ContentFileUnsupported`), as specified by `skills_catalog`.

#### Scenario: Toolset header

- **WHEN** the details popup opens for logged-out toolset `Figma` in `Organization / Design`
- **THEN** the catalog header SHALL show a 52 px icon, the caption "Toolset", the name and the folder path "Organization / Design"
- **AND** its credentials action SHALL be Log in, with no other header action

#### Scenario: Agent action row

- **WHEN** the details popup opens for an agent that shows Credentials
- **THEN** Credentials SHALL sit in a row under the header, indented by `ps-[60px]`, before the tab row
- **AND** no Connection button SHALL be rendered in that row

#### Scenario: Loading skeleton

- **WHEN** details are loading
- **THEN** a skeleton line with accessible label `LoadingDetails` SHALL be shown next to the tab row

#### Scenario: Translated Markdown controls

- **WHEN** the About tab renders a code block
- **THEN** its copy control SHALL be labelled with `quickAppEditor` `MarkdownCopyCode`
