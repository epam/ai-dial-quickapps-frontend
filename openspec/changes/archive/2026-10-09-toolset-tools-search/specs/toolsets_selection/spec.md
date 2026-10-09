## MODIFIED Requirements

### Requirement: Toolset About and Overview tabs

The toolset's **About**, **Overview** and **Tools** content SHALL be the catalog's, as defined by `catalog-entity-details`:

- **About:** `AboutTab` with the listing `description` and `topics`, shown from the moment the popup opens.
- **Overview:** `OverviewTab` with the sections `mapEntityDetailsToCatalogDetails` builds from `toolsetDetails`. These are Capabilities (from `features`) and Specification: authentication, provider, vendor, license, knowledge cutoff, parameters, hosted by (`owner`) and creation date, each only when present.
- **Tools:** `ToolsTab` with the tool definitions the catalog mapper builds from `allowedTools`, or from `allToolNames` when the allow-list is empty. Above the list it shows the catalog's search field and the number of tools shown. The search filters by tool name or description, ignoring case, and shows "No results found" when nothing matches. All four strings are translated `quickAppEditor` / `common` keys: `Search tools...`, `Clear search`, `{{count}} tools` and `No results found`.

This app SHALL NOT build Overview rows or tool lists of its own.

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

#### Scenario: No tools reported

- **WHEN** both tool lists are empty or absent
- **THEN** no Tools tab SHALL be shown
