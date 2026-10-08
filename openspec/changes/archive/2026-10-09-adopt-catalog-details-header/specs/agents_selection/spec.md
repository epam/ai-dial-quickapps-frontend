# Spec Delta

## MODIFIED Requirements

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
