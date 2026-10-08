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

The popup SHALL open on the first tab. The popup shell stays as specified by `skills_catalog`, `toolsets_selection` and `agents_selection`: the catalog `DetailsHeader` (identity, folder path, toolset credentials action), the Connection / Credentials actions, Delete and Close.

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
