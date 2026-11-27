# Spec Delta

## MODIFIED Requirements

### Requirement: Deployment details for toolsets, agents and models

When a toolset, agent or model details popup opens for an entity present in `DataContext`, `useEntityDetails` SHALL fetch and map its details:

- through `useCatalogItemDetails(...).onFetchDetails(item)` from `@epam/ai-dial-chat-hooks/catalog`;
- with the `CatalogDetailsApi` adapter `createCatalogDetailsApi` (`src/utils/catalog-details-api.ts`), whose `getDeploymentDetails` / `getDeploymentLimits` call `deploymentsApi.getDeploymentDetails` / `getDeploymentLimits` with `{ deployment: encodeDialPath(id) }`;
- with translated `entityDetailsLabels` and `deploymentLimitsLabels`, `isAdmin: false`, and `dialCoreExternalUrl` from the app settings (`AppContext`), so the catalog builds the Connect data (`details.api`): the MCP endpoint for toolsets and MCP agents, the chat-completions endpoints for models and other agents.

The hook requests the details, plus the limits for models, in parallel, and maps them with chat-hooks' own `mapDeploymentDetailsDtoToEntityDetails`, `mapEntityDetailsToCatalogDetails` and `mapDeploymentLimitsDtoToCatalogLimits`. A failed limits request SHALL only omit Limits. An `undefined` result from `onFetchDetails` SHALL be treated as a failure.

The model's top-level `modelDetails.provider`, when present, SHALL appear in Overview with the translated Provider label. Toolset and agent Overview SHALL NOT derive a provider from `catalogProperties`.

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
    "catalogProperties": { "license": "Proprietary" },
    "createdAt": 1714768496000
  }
}
```

Rendered result:

- Overview with a Specification section: Authentication, License "Proprietary", Hosted by "Figma", and the creation date.
- Tools listing `evaluate_script` and `get_design_context`.

#### Scenario: Model details and limits load together

- **WHEN** the popup opens for model `gpt-4o`
- **THEN** exactly one details request and one limits request for `gpt-4o` SHALL be made, in parallel

#### Scenario: Model provider is displayed

- **WHEN** the model details response includes `modelDetails.provider`
- **THEN** Overview SHALL show that value with the translated Provider label

#### Scenario: Toolset has no provider

- **WHEN** a toolset's details response contains its owner and catalog license
- **THEN** Overview SHALL show Hosted by and License without inventing a Provider field

#### Scenario: Limits fail

- **WHEN** the limits request fails and the details request succeeds
- **THEN** About, Overview and Pricing SHALL be shown, and Limits SHALL NOT

#### Scenario: Stale response

- **WHEN** a details response arrives after the popup closed or switched to another entity
- **THEN** it SHALL be ignored
