# catalog-entity-details Specification

## Purpose

The app editor’s skill, toolset and agent details popups show the same tabs, order and content as the DIAL chat catalog. The popups render the catalog’s own tab components, fed by the catalog’s data pipeline (`useCatalogItemDetails` from `@epam/ai-dial-chat-hooks`) over this app’s chat-api client, with every catalog label translated through `quickAppEditor` keys.

## Requirements

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

### Requirement: Deployment details for toolsets, agents and models

When a toolset, agent or model details popup opens for an entity present in `DataContext`, `useEntityDetails` SHALL fetch and map its details:

- through `useCatalogItemDetails(...).onFetchDetails(item)` from `@epam/ai-dial-chat-hooks/catalog`;
- with the `CatalogDetailsApi` adapter `createCatalogDetailsApi` (`src/utils/catalog-details-api.ts`), whose `getDeploymentDetails` / `getDeploymentLimits` call `deploymentsApi.getDeploymentDetails` / `getDeploymentLimits` with `{ deployment: encodeDialPath(id) }`;
- with translated `entityDetailsLabels` and `deploymentLimitsLabels`, `isAdmin: false`, and `dialCoreExternalUrl` from the app settings (`AppContext`), so the catalog builds the Connect data (`details.api`): the MCP endpoint for toolsets and MCP agents, the chat-completions endpoints for models and other agents.

The hook requests the details, plus the limits for models, in parallel, and maps them with chat-hooks' own `mapDeploymentDetailsDtoToEntityDetails`, `mapEntityDetailsToCatalogDetails` and `mapDeploymentLimitsDtoToCatalogLimits`. A failed limits request SHALL only omit Limits. An `undefined` result from `onFetchDetails` SHALL be treated as a failure.

The fetch state SHALL be a string enum `DetailsStatus` (`Idle`, `Loading`, `Ready`, `Error`) in `src/types/entity-details.ts`. The hook SHALL abort on unmount and ignore a response for an entity the popup no longer shows. Nothing SHALL be cached across opens; chat-api caches details for 60 s per user.

No request SHALL be made for an entity missing from the catalog, an inline toolset, or a read-only render that was never opened.

Requests:

- `GET /api/v1/deployments/{deployment}/details`
- `GET /api/v1/deployments/{deployment}/limits` (models only)

`deployment` is the canonical chat-api id, each segment percent-encoded, URL-encoded once more by the client.

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
    "allToolNames": ["evaluate_script", "get_design_context"],
    "authSettings": { "authenticationType": "OAUTH" },
    "owner": "Figma",
    "catalogProperties": { "provider": "Figma", "license": "Proprietary" },
    "createdAt": 1714768496000
  }
}
```

Rendered result:

- Overview with a Specification section: Authentication, Provider "Figma", License "Proprietary", Hosted by "Figma", and the creation date.
- Tools listing `evaluate_script` and `get_design_context`.

#### Scenario: Model details and limits load together

- **WHEN** the popup opens for model `gpt-4o`
- **THEN** exactly one details request and one limits request for `gpt-4o` SHALL be made, in parallel

#### Scenario: Limits fail

- **WHEN** the limits request fails and the details request succeeds
- **THEN** About, Overview and Pricing SHALL be shown, and Limits SHALL NOT

#### Scenario: Stale response

- **WHEN** a details response arrives after the popup closed or switched to another entity
- **THEN** it SHALL be ignored

### Requirement: Details loading and failure

While details load, the popup SHALL show the About tab from the listing (`description`, `topics`). It SHALL show a loading indicator next to the tab row, with accessible label `quickAppEditor` `LoadingDetails`, as `DetailsPanel` does with `isDetailsLoading`. When the details request fails, the popup SHALL keep About, SHALL show `quickAppEditor` `FailedToLoadDetails` with a **Retry** (`quickAppEditor` `Retry`) that repeats the requests, and the header actions and footer SHALL stay usable.

#### Scenario: Loading

- **WHEN** the details request is pending
- **THEN** About SHALL be shown with the listing description, plus the loading indicator
- **AND** Delete, Close and the header actions SHALL work

#### Scenario: Failure and retry

- **WHEN** the details request fails
- **THEN** About SHALL stay visible with the failure message and Retry
- **AND** activating Retry SHALL request the details again and, on success, add the data-driven tabs

### Requirement: Localised catalog content

Every catalog component and mapper SHALL receive translated text from this app's `quickAppEditor` namespace. No catalog English default SHALL be shown:

- **Tab labels:** `AboutTab`, `SkillDetailsTab`, `SkillOverviewTab`, `PricingTab`, `LimitsTab`, `ToolsTab`.
- **Overview:** the section titles and spec labels passed to `mapEntityDetailsToCatalogDetails`'s `labels` (e.g. `OverviewCapabilities`, `OverviewSpecification`, `OverviewProvider`, `OverviewHostedBy`, …), `OverviewYes` / `OverviewNo` for boolean values, and the skill overview labels passed to `buildSkillOverview`: `SkillWhenToUse`, `SkillAllowedTools`, `SkillBundledResources`, `SkillAuthor`, `OverviewLastUpdated`, `SkillFileCount`, plus the section titles (`OverviewSpecification`, `SkillTypeLabel`).
- **Pricing and Limits:** the section labels and the limits row labels passed to `mapDeploymentLimitsDtoToCatalogLimits`.
- **Markdown:** the code-block and table labels the catalog forwards to its Markdown renderer.

#### Scenario: Translated Overview

- **WHEN** the Overview of a toolset is rendered
- **THEN** its section titles and spec labels SHALL be the translated `quickAppEditor` values, not the catalog's English defaults

### Requirement: Catalog content accessibility and direction

The catalog tab row SHALL follow the ARIA tabs pattern. Its panels SHALL be reachable with Tab after the header actions and before the footer. They SHALL follow `document.documentElement.dir` as they do in the chat catalog.

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** the tab row SHALL run About → last tab from right to left
- **AND** the Overview label column SHALL be at the start (right)
- **AND** the popup shell SHALL keep Delete at the start and Close at the end

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
