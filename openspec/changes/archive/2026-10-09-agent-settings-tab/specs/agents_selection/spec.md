## ADDED Requirements

### Requirement: Agent Settings tab

The agent details popup SHALL offer this app's own **Settings** tab, labelled by
`quickAppEditor` `Settings` ("Settings"). It holds the transport the orchestrator
uses to call the agent. It SHALL be placed after every catalog tab
(`catalog-entity-details` "App-owned tabs in add-on details popups"), so that for an
MCP-capable application with a DIAL Core URL the tabs read About, Overview,
Connect, Settings. The popup SHALL still open on About.

**Shown when:** the agent is an application that supports MCP
(`doesAgentSupportMcp`) **and** serves chat completion (its id is in
`DataContext.modelsMap`). The check is `canChooseAgentTransport` in
`src/utils/map-agent-to-catalog-item.ts`. The tab is shown in editable and read-only
applications. It SHALL NOT be rendered for models, MCP-only agents or agents missing
from the catalog.

**Connect via.** The tab panel (`AgentSettingsTab`,
`src/components/Agents/AgentSettingsTab/`) SHALL render:

- **Control:** a ui-kit `RadioGroup` labelled `quickAppEditor` `ConnectVia`
  ("Connect via"), with the options `MCP` ("MCP", value `mcp`) and `ChatCompletion`
  ("Chat Completion", value `chat-completion`).
- **Selected value:** the entry's saved `transport`, or `mcp` when the entry has
  none. This is the value save writes for such an entry.
- **Change:** selecting an option SHALL call `configureAgent(id, transport)` from
  `useQuickApp2Form` at once. The form becomes dirty, the popup stays open on
  Settings, and there is no Apply step.
- **Read-only:** in a read-only or shared application the group SHALL be disabled
  and SHALL show the saved value.

**State and data.**

- Transport is form state owned by `useQuickApp2Form`. The panel holds no state of
  its own and SHALL re-render from the form value.
- No chat-api endpoint, host message or context is introduced.
- The `appTabs` array passed to the popup shell SHALL be memoised (`useMemo`).
- The change handler SHALL be stable (`useCallback`).

#### Scenario: Settings tab for an MCP and chat-completion application

- **WHEN** an editable application has agent `applications/research-agent`, which supports MCP and is in `modelsMap`, with no saved transport, and the user opens its details
- **THEN** the tabs SHALL end with Settings, with About selected
- **AND** in Settings, "Connect via" SHALL show MCP selected and Chat Completion enabled

#### Scenario: Change the transport

- **WHEN** the user opens Settings and selects "Chat Completion"
- **THEN** that entry's tool data SHALL get `transport: "chat-completion"` and the form SHALL become dirty
- **AND** the details popup SHALL stay open with Settings selected and "Chat Completion" checked

#### Scenario: Saved transport is preselected

- **WHEN** the entry's tool data carries `transport: "chat-completion"` and the user opens Settings
- **THEN** "Chat Completion" SHALL be checked

#### Scenario: No Settings tab without a transport choice

- **WHEN** the user opens the details of a model, or of an MCP-only agent (in `mcpAgentsMap`, not in `modelsMap`)
- **THEN** no Settings tab SHALL be rendered

#### Scenario: Read-only transport

- **WHEN** a read-only or shared application opens the details of an MCP and chat-completion application whose saved transport is `chat-completion`
- **THEN** Settings SHALL show "Connect via" disabled with "Chat Completion" checked

## MODIFIED Requirements

### Requirement: Agent details popup

Activating an Agents row item SHALL open a modal dialog (ui-kit `Popup`, `PopupSize.Lg`).

**Header:** the catalog `DetailsHeader`, as in the toolset popup. It shows:

- the icon;
- a caption: `quickAppEditor` `AgentTypeLabel` ("Agent") for applications and MCP
  agents, `Model` ("Model") for models;
- the name and version;
- the folder path;
- × labelled by `common` `CloseDialog`.

The header SHALL show no action of its own.

The dialog's accessible name SHALL be the agent name.

**Action** (in the row under the header, where the catalog shows a toolset's Log in;
editable applications only):

- **Credentials** (`quickAppEditor` `ApplicationCredentials`, ghost button with a
  leading key icon).
  - **Shown when:** the entry URL carries `applicationCredentials=true`, the entity
    is an application, and `useApplicationAuthentication(id)` reports that it needs
    authentication. That hook calls `externalServicesApi.listExternalServices`
    (`GET /api/v1/external-services/{appId}`), and a non-empty list means the app
    needs authentication. For example, `GET /api/v1/external-services/applications%2Fresearch-agent`
    returns `[{ "id": "github", "displayName": "GitHub", "authenticationType": "OAUTH" }]`.
  - **Activating it** SHALL close the details popup and call
    `requestApplicationCredentials(id, allowedOrigins)`, which posts
    `REQUEST_APPLICATION_CREDENTIALS { appId }` to the host. The host then shows its
    own credential forms, so the two dialogs are never stacked. No secret enters the
    editor.

No other button SHALL be rendered in that row. The transport lives in the Settings
tab ("Agent Settings tab"), and no secondary dialog SHALL be opened from the popup.

The popup SHALL show no status banner; the deployment status stays on the row item.

**Tabs:**

- the catalog's details tabs and content, as defined by `catalog-entity-details`,
  for a catalog `CatalogItem` of type `Model` (models) or `Agent` (applications and
  MCP agents);
- then, when there is a transport choice, the app-owned Settings tab.

The popup SHALL open on About.

**Footer:**

- **Delete** (`quickAppEditor` `RemoveSkillFromApp`, "Delete"; danger, outlined, leading trash icon) at the start edge;
- **Close** at the end edge.

The popup SHALL be loaded with `React.lazy`.

#### Scenario: Popup for an MCP-capable application

- **WHEN** the user activates an item for an application that supports MCP and chat completion, in an editable application, and its details load
- **THEN** a dialog named after it SHALL show the "Agent" caption and the About, Overview and Settings tabs with About selected, plus Delete and Close
- **AND** no Connection button SHALL be rendered

#### Scenario: Popup for a model

- **WHEN** the user opens a model's details and its details and limits load
- **THEN** the caption SHALL be "Model", the tabs SHALL be About, Overview, Pricing and Limits, and neither Credentials nor a Settings tab SHALL be shown

#### Scenario: Application credentials

- **WHEN** the entry URL has `applicationCredentials=true` and the attached application needs authentication
- **THEN** Credentials SHALL be shown under the header, before the tab row, and not inside Settings
- **AND** activating it SHALL close the details popup and post exactly one `REQUEST_APPLICATION_CREDENTIALS { appId }` to the host
- **AND** without `applicationCredentials=true`, Credentials SHALL NOT be rendered

#### Scenario: Credentials for an MCP-only application

- **WHEN** an MCP-only agent needs authentication and the entry URL has `applicationCredentials=true`
- **THEN** Credentials SHALL be shown under the header and no Settings tab SHALL be rendered

#### Scenario: Agent unavailable

- **WHEN** the popup opens for an attached agent that is not in the catalog
- **THEN** the content SHALL show `quickAppEditor` `AgentUnavailable` ("This agent is no longer available") in place of the tabs, and no chat-api request SHALL be made
- **AND** neither Credentials nor a Settings tab SHALL be shown, and Delete SHALL still be offered in an editable application

#### Scenario: Read-only application

- **WHEN** the popup opens in a read-only or shared application
- **THEN** only Close SHALL be rendered in the footer, and no Credentials action SHALL be rendered

### Requirement: Agent About and Overview tabs

The agent's tab content SHALL be the catalog's, as defined by `catalog-entity-details`:

- **About:** `AboutTab` with the listing `description` and `topics`.
- **Overview:** `OverviewTab` with the sections `mapEntityDetailsToCatalogDetails` builds from `modelDetails` or `applicationDetails`:
  - Capabilities: tools, parallel tool calls, reasoning efforts, skills, …;
  - Specification: provider, vendor, license, knowledge cutoff, parameters, hosted by, release date, context window, max output tokens, input modalities, …;
  - each row only when present.
- **Pricing:** `PricingTab`, when the details carry pricing (models, and applications whose details include it).
- **Limits:** `LimitsTab`, for models, from `GET /api/v1/deployments/{deployment}/limits`.

This app SHALL NOT build Overview rows of its own. The saved transport of an
MCP-capable application is not an Overview row. It is visible and editable in the
Settings tab ("Agent Settings tab").

#### Scenario: Model Overview, Pricing and Limits

- **WHEN** the details of `gpt-4o` carry a context window, provider and prompt/completion prices, and its limits carry a daily token limit
- **THEN** Overview SHALL show Specification rows for provider and context window, Pricing SHALL show the prices, and Limits SHALL show the daily limit, all with translated labels

#### Scenario: Application without pricing

- **WHEN** an application's details carry no pricing, and it offers no transport choice
- **THEN** its popup SHALL show About and Overview only

### Requirement: Agents accessibility and direction

The Agents row, the Add agent popup and the agent details popup SHALL be keyboard operable, SHALL expose translated names, and SHALL follow the document direction.

#### Scenario: Keyboard

- **WHEN** the details popup is open
- **THEN** focus SHALL be inside the dialog, the tabs (including Settings) SHALL follow the ARIA tabs pattern, and Credentials, the tab panel's controls, Delete and Close SHALL be reachable with Tab in reading order
- **AND** in Settings, "Connect via" SHALL be a radio group named "Connect via" whose options are selected with the arrow keys

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** row items SHALL run avatar → name → version from right to left with the trash button at the end (left)
- **AND** in the popup Delete SHALL be at the start (right) and Close at the end (left)
- **AND** the Credentials row and the Settings radio controls SHALL sit at the start (right), using logical properties only
- **AND** no icon SHALL be mirrored (avatar, key, trash and × are not directional)

#### Scenario: Localization

- **WHEN** any of the three surfaces is rendered in a supported locale
- **THEN** every user-visible string SHALL come from the `quickAppEditor` or `common` keys named in this spec, and none SHALL be hardcoded
