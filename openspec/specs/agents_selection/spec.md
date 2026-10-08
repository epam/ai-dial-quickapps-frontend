# agents_selection Specification

## Purpose
Defines how the Quick App editor lists, inspects, configures, removes and picks agents — applications, MCP agents and models the orchestrator can delegate to — in the Agents row of the Add-ons card: the attached agents list (with status and a hover remove button), the agent details popup (About and Overview tabs, Connection and Credentials actions, and a Delete that detaches the agent from the app only), and the Add agent popup (catalog list with search, From filter, sort and multi-selection confirmed with Add). The agents are the agent entries of the editor's `addOns` form value (owned by `useQuickApp2Form`), which it shares with `toolsets_selection`; agent data comes from `DataContext`, and the popups keep their own UI state locally.
## Requirements
### Requirement: Agent entries of the add-ons value

The Agents row SHALL show and edit only the agent entries of the `addOns` form value (owned by `useQuickApp2Form`). These are the entries `getAddOnKind` classifies as `AddOnKind.Agent`, i.e. every entry that is not a toolset entry (`toolsets_selection` "Toolset entries of the add-ons value"):

- applications, including MCP-only agents from `DataContext.mcpAgentsMap`;
- models used as dial-deployment simple tools;
- `applications/…` ids that are missing from the catalog;
- dial-deployment tools whose model is no longer listed.

Each edit made from the Agents row SHALL change only agent entries. Toolset entries SHALL keep their values and their positions in the array. The form value's shape and the `tool_sets` save mapping SHALL NOT change.

#### Scenario: Models are agents

- **WHEN** `addOns` holds model `gpt-4o` (saved as a `dial-deployment` simple tool) and application `applications/public/research-agent`
- **THEN** both SHALL be listed in the Agents row
- **AND** saving without changes SHALL write the same `dial-deployment` and `dial-app` entries to `tool_sets`

#### Scenario: Editing agents leaves toolsets untouched

- **WHEN** `addOns` is `[A1, T1, A2]` and the user removes `A1` from the Agents row
- **THEN** `addOns` SHALL become `[T1, A2]` and `T1` SHALL keep its tool data

### Requirement: Attached agents list

The Agents row SHALL list the attached agents in `addOns` order. It SHALL use the same shared row item as the Skills and Toolsets rows. Each item SHALL show:

- the avatar: `DeploymentIcon` with `iconUrl`, falling back to initials;
- the localized name, falling back to the id's last segment without version;
- the version as secondary text when one is known.

**Status line.** Below the name, the item SHALL show the `getEntityStatusMessage` text (read-only wording) when the agent is not found in the catalog, or is deploying, undeploying, redeploying or undeployed.

**Details button.** Each item SHALL hold a button named by `quickAppEditor` key `SkillDetails` with `{{name}}`. Activating it SHALL open the agent details popup.

**Remove button.** In an editable application, each item SHALL hold a hover/focus-revealed trash button named by `quickAppEditor` key `RemoveSkill` with `{{name}}`. It SHALL have the same visibility, tab-order, removal and refocus behaviour as the Toolsets row.

**Not rendered.** Items SHALL NOT render a chip box, a tooltip, or a configure (gear) or credentials button. Those actions live in the details popup.

**Data.** The list SHALL read `modelsMap`, `mcpAgentsMap` and `toolsetsMap` from `DataContext` and SHALL make no chat-api request of its own. The open popup id SHALL be local `useState` in the list component.

#### Scenario: Agents are listed

- **WHEN** an application loads with agents Research Agent (version `2.1`) and GPT-4o
- **THEN** the Agents row SHALL show both, with "2.1" after Research Agent's name
- **AND** each item SHALL have a "Remove <name>" button revealed on hover or focus

#### Scenario: Undeployed agent

- **WHEN** an attached application has `functionStatus` `UNDEPLOYED`
- **THEN** its item SHALL show the `common` `UndeployedApp` text under the name

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** agents SHALL still be listed and SHALL still open the details popup
- **AND** no remove button SHALL be rendered

### Requirement: Agent details popup

Activating an Agents row item SHALL open a modal dialog (ui-kit `Popup`, `PopupSize.Lg`).

**Header:** the catalog `DetailsHeader`, as in the toolset popup: the icon, a caption (`quickAppEditor` `AgentTypeLabel` ("Agent") for applications and MCP agents, `Model` ("Model") for models), the name and version, and the folder path; plus × labelled by `common` `CloseDialog`. The header SHALL show no action of its own.

The dialog's accessible name SHALL be the agent name.

**Actions** (below the header, editable applications only):

- **Connection** (`quickAppEditor` `AgentConnection`, ghost button with a leading settings icon). Shown when the entity is an application that supports MCP (`isDialAiEntityModel` and `doesAgentSupportMcp`). It SHALL open the existing transport dialog (`DialAppConfigurationModal`, moved to `src/components/Agents/DialAppConfigurationModal/`), preselected with the entry's saved `transport`. Saving that dialog SHALL call `configureAgent(id, transport)` (`useQuickApp2Form`) and return to the details popup.
- **Credentials** (`quickAppEditor` `ApplicationCredentials`, ghost button with a leading key icon). Shown only when the entry URL carries `applicationCredentials=true`, the entity is an application, and `useApplicationAuthentication(id)` reports that it needs authentication. Activating it SHALL call `requestApplicationCredentials(id, allowedOrigins)`, which posts `REQUEST_APPLICATION_CREDENTIALS` to the host as today.

The popup SHALL show no status banner; the deployment status stays on the row item.

**Tabs:** the catalog's details tabs and content, as defined by `catalog-entity-details`, for a catalog `CatalogItem` of type `Model` (models) or `Agent` (applications and MCP agents). The popup SHALL open on About.

**Footer:**

- **Delete** (`quickAppEditor` `RemoveSkillFromApp`, "Delete"; danger, outlined, leading trash icon) at the start edge;
- **Close** at the end edge.

The popup SHALL be loaded with `React.lazy`.

#### Scenario: Popup for an MCP-capable application

- **WHEN** the user activates an MCP-capable application's item in an editable application and its details load
- **THEN** a dialog named after it SHALL show the "Agent" caption, a Connection button, the About and Overview tabs with About selected, and Delete and Close

#### Scenario: Configure the transport

- **WHEN** the user activates Connection, selects "Chat completion" and applies
- **THEN** that entry's tool data SHALL get `transport: "chat-completion"`, the form SHALL become dirty, and the details popup SHALL still be open

#### Scenario: Popup for a model

- **WHEN** the user opens a model's details and its details and limits load
- **THEN** the caption SHALL be "Model", the tabs SHALL be About, Overview, Pricing and Limits, and neither Connection nor Credentials SHALL be shown

#### Scenario: Application credentials

- **WHEN** the entry URL has `applicationCredentials=true` and the attached application needs authentication
- **THEN** the popup SHALL show Credentials, and activating it SHALL post exactly one `REQUEST_APPLICATION_CREDENTIALS { appId }` to the host
- **AND** without `applicationCredentials=true`, Credentials SHALL NOT be rendered

#### Scenario: Agent unavailable

- **WHEN** the popup opens for an attached agent that is not in the catalog
- **THEN** the content SHALL show `quickAppEditor` `AgentUnavailable` ("This agent is no longer available") in place of the tabs, and no chat-api request SHALL be made
- **AND** no Connection or Credentials action SHALL be shown, and Delete SHALL still be offered in an editable application

#### Scenario: Read-only application

- **WHEN** the popup opens in a read-only or shared application
- **THEN** only Close SHALL be rendered in the footer, and no Connection or Credentials action SHALL be rendered

### Requirement: Agent About and Overview tabs

The agent's tab content SHALL be the catalog's, as defined by `catalog-entity-details`:

- **About:** `AboutTab` with the listing `description` and `topics`.
- **Overview:** `OverviewTab` with the sections `mapEntityDetailsToCatalogDetails` builds from `modelDetails` or `applicationDetails`:
  - Capabilities: tools, parallel tool calls, reasoning efforts, skills, …;
  - Specification: provider, vendor, license, knowledge cutoff, parameters, hosted by, release date, context window, max output tokens, input modalities, …;
  - each row only when present.
- **Pricing:** `PricingTab`, when the details carry pricing (models, and applications whose details include it).
- **Limits:** `LimitsTab`, for models, from `GET /api/v1/deployments/{deployment}/limits`.

This app SHALL NOT build Overview rows of its own. The saved Connection (transport) of an MCP-capable application is no longer an Overview row; it stays visible and editable through the Connection action.

#### Scenario: Model Overview, Pricing and Limits

- **WHEN** the details of `gpt-4o` carry a context window, provider and prompt/completion prices, and its limits carry a daily token limit
- **THEN** Overview SHALL show Specification rows for provider and context window, Pricing SHALL show the prices, and Limits SHALL show the daily limit, all with translated labels

#### Scenario: Application without pricing

- **WHEN** an application's details carry no pricing
- **THEN** its popup SHALL show About and Overview only

### Requirement: Remove an agent from the application

**Delete** in the agent details popup SHALL remove that id from `addOns` and close the popup. It SHALL NOT call any chat-api mutation. Read-only and shared applications SHALL NOT render it.

#### Scenario: Delete detaches the agent

- **WHEN** an editable application has `[A1, T1]` and the user activates Delete in `A1`'s popup
- **THEN** `addOns` SHALL become `[T1]`, the form SHALL become dirty, and the popup SHALL close

### Requirement: Add agent popup

The Agents row's Add action SHALL open the **Add agent** popup. It SHALL match the Add skill popup (`skills_catalog`) with these differences:

- **Text:** title `quickAppEditor` `AddAgent` ("Add agent"); heading `AgentsCatalog` ("Agents catalog"); search `SearchAgents` ("Search agents...").
- **Content:** the rows are `DataContext.models` and `DataContext.mcpAgents`:
  - without hidden-folder ids;
  - without the application being edited (`getEntityIdWithoutVersion(app.id)`), so it can't call itself;
  - mapped by `mapAgentToCatalogItem`, with item type `Model` for models and `Agent` otherwise.
- **List:** `ListView` uses `type={CatalogEntityType.Agent}`, multi-select and `isReadonly`.
- **Checkbox names:** row checkboxes use `SelectSkill`; select-all uses `SelectAllAgents`.
- **States:** the loading label is `LoadingAgents`, the error title `FailedToLoadAgents`, and the empty-catalog title `NoAgentsAvailable`.
- **Pre-check:** only attached agent ids start checked.
- **Add** SHALL apply `applyCatalogSelection` to the full `addOns` id list:
  - kept agents and every toolset entry stay in place, with their tool data;
  - unchecked listed agents are removed;
  - newly checked agents are appended in check order.

The popup state SHALL be local `useState`, reset on each open, and the popup SHALL be loaded with `React.lazy`.

**Deep link.** The `agentsAndToolsetsModal=1` entry query parameter (`AddOnsModalQueryParams.Modal`), which opened the merged picker on load, SHALL open the Add agent popup on load in an editable application.

#### Scenario: Popup lists agents and models

- **WHEN** the user activates Add in the Agents row and data has loaded
- **THEN** a dialog named "Add agent" SHALL list applications, MCP agents and models, with no toolsets and not the application being edited

#### Scenario: Confirm keeps toolsets

- **WHEN** `addOns` is `[A1, T1]`, the user checks `A2`, and activates Add
- **THEN** `addOns` SHALL become `[A1, T1, A2]`

#### Scenario: Deep link

- **WHEN** an editable application is opened with `agentsAndToolsetsModal=1`
- **THEN** the Add agent popup SHALL be open after load

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** the Add action SHALL be disabled with the shared-application tooltip, and the popup SHALL NOT open, including through the deep link

### Requirement: Agents accessibility and direction

The Agents row, the Add agent popup and the agent details popup SHALL be keyboard operable, SHALL expose translated names, and SHALL follow the document direction.

#### Scenario: Keyboard

- **WHEN** the details popup is open
- **THEN** focus SHALL be inside the dialog, the tabs SHALL follow the ARIA tabs pattern, and Connection, Credentials, Delete and Close SHALL be reachable with Tab in reading order
- **AND** closing the transport dialog SHALL return focus to the Connection button

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** row items SHALL run avatar → name → version from right to left with the trash button at the end (left)
- **AND** in the popup Delete SHALL be at the start (right) and Close at the end (left)
- **AND** no icon SHALL be mirrored (avatar, settings, key, trash and × are not directional)

#### Scenario: Localization

- **WHEN** any of the three surfaces is rendered in a supported locale
- **THEN** every user-visible string SHALL come from the `quickAppEditor` or `common` keys named in this spec, and none SHALL be hardcoded

