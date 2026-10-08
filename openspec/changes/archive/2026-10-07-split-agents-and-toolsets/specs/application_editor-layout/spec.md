## MODIFIED Requirements

### Requirement: Presentation change preserves form contract
The layout change SHALL preserve existing form state ownership, field names, conditional behavior, read-only behavior, and persistence without introducing new chat-api requests. Skills SHALL continue to use the existing `agentSkills` form value. The Toolsets and Agents rows SHALL both continue to use the existing `agentsAndToolsets` form value: each row shows and edits only its own entries, as classified by `toolsets_selection` ("Toolset entries of the add-ons value") and `agents_selection` ("Agent entries of the add-ons value").

#### Scenario: Save after layout reorganization
- **WHEN** a user changes a moved Skills, Toolsets or Agents selection or the instructions and saves
- **THEN** the saved application SHALL contain the same corresponding configuration values as before the reorganization
- **AND** the editor SHALL make no additional chat-api request because of the layout change

#### Scenario: Read-only editor
- **WHEN** the editor is read-only or the application is shared
- **THEN** moved controls SHALL retain their existing disabled/read-only behavior
- **AND** Add actions SHALL not allow a selection modal to be opened

#### Scenario: Existing selections remain visible
- **WHEN** an application loads with one or more skills, toolsets or agents already selected
- **THEN** the corresponding Add-ons content window SHALL be visible
- **AND** the selected skills SHALL be listed as defined by `skills_catalog` ("Attached skills list")
- **AND** the selected toolsets SHALL be listed as defined by `toolsets_selection` ("Attached toolsets list"), and the selected agents as defined by `agents_selection` ("Attached agents list"), with removal, sign-in and configuration available from the rows' trash buttons and details popups

### Requirement: Add-ons section groups add-on controls
The editor SHALL render an Add-ons section directly below Instructions. The section SHALL contain, in this order, a Skills row, a Toolsets row, an Agents row and the Conversation starters row. Each row SHALL show its title and its Add action together in a row header, and the Add action SHALL open that row's selection modal.

#### Scenario: Empty Add-ons section
- **WHEN** the editor loads with no selected skills, toolsets or agents
- **THEN** the Add-ons heading SHALL be visible below Instructions
- **AND** the Skills, Toolsets and Agents rows SHALL each display their Add action in the row header
- **AND** none of these rows SHALL display a content window

#### Scenario: Add action opens the selection modal
- **WHEN** a user activates the Add action of the Skills, Toolsets or Agents row in an editable editor
- **THEN** that row's selection modal SHALL open: Add skill, Add toolset or Add agent
- **AND** confirming the modal SHALL update the `agentSkills` value, or the corresponding entries of the `agentsAndToolsets` value, and close the modal

#### Scenario: Add-on labels and localization
- **WHEN** the Add-ons section is rendered in any supported locale
- **THEN** the section and row labels SHALL be translated through the `quickAppEditor` keys `AddOns`, `Skills`, `Toolsets` ("Toolsets") and `Agents` ("Agents")
- **AND** the empty-row descriptions SHALL use `AgentSkillsDescription`, `ToolsetsDescription` ("External tools and services the agent can call, such as MCP servers.") and `AgentsDescription` ("Sub-agents this agent can delegate tasks to.")
- **AND** the Add tooltips SHALL use `AddAgentSkills`, `AddToolsets` ("Add toolsets") and `AddAgents` ("Add agents"), or the shared-application tooltip when read-only
- **AND** no user-visible label SHALL be hardcoded in the component

#### Scenario: Add-ons accessibility
- **WHEN** a keyboard or assistive-technology user reaches the Add-ons section
- **THEN** the section and rows SHALL expose meaningful translated headings/labels
- **AND** the Add actions SHALL remain keyboard reachable and have button semantics
- **AND** hiding an empty content window SHALL not leave an orphaned `aria-expanded` control claiming that content is open

### Requirement: Agents and Toolsets content window is conditional
The Toolsets row SHALL render its content window (the attached toolsets list) only when at least one toolset entry is selected. The Agents row SHALL render its content window (the attached agents list) only when at least one agent entry is selected. Each row's Add action SHALL remain visible regardless of selection count.

#### Scenario: No toolsets selected
- **WHEN** `agentsAndToolsets` holds no toolset entry, but may hold agent entries
- **THEN** the Toolsets Add action SHALL be visible and enabled unless the editor is read-only
- **AND** the Toolsets row SHALL show its description and no content window

#### Scenario: No agents selected
- **WHEN** `agentsAndToolsets` holds no agent entry, but may hold toolset entries
- **THEN** the Agents Add action SHALL be visible and enabled unless the editor is read-only
- **AND** the Agents row SHALL show its description and no content window

#### Scenario: Toolset or agent selected
- **WHEN** `agentsAndToolsets` holds at least one entry of a row's kind
- **THEN** that row SHALL render its list, with no chip box
- **AND** its Add action SHALL remain visible in the row header

#### Scenario: Last toolset removed
- **WHEN** a user removes the last toolset entry with its trash button, through the details popup's Delete, or by unchecking it in Add toolset and confirming
- **THEN** the Toolsets content window SHALL be removed
- **AND** the agent entries of `agentsAndToolsets`, and unrelated context settings, SHALL be unchanged

#### Scenario: Last agent removed
- **WHEN** a user removes the last agent entry
- **THEN** the Agents content window SHALL be removed and the toolset entries SHALL be unchanged

### Requirement: Add-ons follows the target visual hierarchy
The Add-ons card SHALL be visually separated from Instructions and SHALL use a larger section heading, smaller semibold row titles, and readable secondary descriptions with consistent vertical spacing between rows. A row's description SHALL be shown only while that row has no selections.

#### Scenario: Add-ons card spacing
- **WHEN** Instructions and Add-ons are rendered in the primary editor column
- **THEN** a visible gap SHALL separate the two cards
- **AND** the Add-ons content SHALL not be separated by a horizontal rule from Instructions

#### Scenario: Add-ons row typography
- **WHEN** the Add-ons rows are rendered
- **THEN** the Add-ons heading SHALL have the section-level heading hierarchy
- **AND** Skills, Toolsets and Agents SHALL use the row-title hierarchy shown in the target design
- **AND** any visible row description SHALL use secondary body text styling

#### Scenario: Row description for an empty row
- **WHEN** a row has no selected items
- **THEN** the row SHALL display its translated description below the row header

#### Scenario: Row description for a populated row
- **WHEN** a row has at least one selected item
- **THEN** the row SHALL not display its description
- **AND** the row SHALL display its content window instead

#### Scenario: Add-ons row spacing
- **WHEN** multiple Add-ons rows are rendered without selected content windows
- **THEN** each row SHALL have consistent vertical whitespace before the next row
- **AND** Add actions SHALL remain aligned with their corresponding row titles

### Requirement: Agents and Toolsets has no JSON view
The Toolsets and Agents rows SHALL NOT offer a JSON view. The editor SHALL NOT render a JSON toggle, a JSON editor, Save JSON or Discard actions, or a discard-JSON confirmation for agents and toolsets. Saving SHALL preserve existing `tool_sets` entries that the rows can represent, including inline toolsets without a `deployment_id`.

#### Scenario: No JSON affordance in any state
- **WHEN** the Add-ons section is rendered, in editable or read-only mode, with or without selected agents or toolsets
- **THEN** no JSON toggle, JSON editor, Save JSON action, or Discard action SHALL be rendered for the Toolsets or Agents rows

#### Scenario: Existing inline toolset is preserved on save
- **WHEN** an application whose saved `tool_sets` contain an inline toolset without a `deployment_id` is loaded and then saved without changing agents or toolsets
- **THEN** the inline toolset SHALL be listed in the Toolsets row
- **AND** the saved `tool_sets` SHALL still contain that inline toolset configuration

#### Scenario: Code interpreter is saved independently of agents and toolsets
- **WHEN** the code interpreter setting is enabled or disabled and the application is saved
- **THEN** the saved `tool_sets` SHALL include or omit the code interpreter toolset accordingly
- **AND** the remaining `tool_sets` entries SHALL be built from the `agentsAndToolsets` form value
