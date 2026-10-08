# Spec Delta

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

The popup SHALL open on the first tab. The popup shell stays as specified by `skills_catalog`, `toolsets_selection` and `agents_selection`: identity header, folder line, credentials / Connection / Credentials actions, status banner, Delete and Close.

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

