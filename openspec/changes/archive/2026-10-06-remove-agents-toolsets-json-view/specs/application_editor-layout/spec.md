## MODIFIED Requirements

### Requirement: Add-ons section groups add-on controls
The editor SHALL render an Add-ons section directly below Instructions. The section SHALL contain a Skills row and one merged Agents & Toolsets row. Each row SHALL show its title and its Add action together in a row header, and the Add action SHALL open that row's existing selection modal.

#### Scenario: Empty Add-ons section
- **WHEN** the editor loads with no selected skills and no selected agents or toolsets
- **THEN** the Add-ons heading SHALL be visible below Instructions
- **AND** the Skills row and merged Agents & Toolsets row SHALL each display their Add action in the row header
- **AND** neither row SHALL display its empty or populated content window

#### Scenario: Add action opens the selection modal
- **WHEN** a user activates the Add action of the Skills row or the Agents & Toolsets row in an editable editor
- **THEN** the existing selection modal for that row SHALL open
- **AND** confirming the modal SHALL update the corresponding `agentSkills` or `agentsAndToolsets` form value and close the modal

#### Scenario: Add-on labels and localization
- **WHEN** the Add-ons section is rendered in any supported locale
- **THEN** user-visible section and row labels SHALL be translated through the `quickAppEditor` namespace keys `AddOns`, `Skills`, and `AgentsAndToolsets`
- **AND** the Add action label and tooltips SHALL use existing `common`/`quickAppEditor` keys
- **AND** no user-visible label SHALL be hardcoded in the component

#### Scenario: Add-ons accessibility
- **WHEN** a keyboard or assistive-technology user reaches the Add-ons section
- **THEN** the section and rows SHALL expose meaningful translated headings/labels
- **AND** the Add actions SHALL remain keyboard reachable and have button semantics
- **AND** hiding an empty content window SHALL not leave an orphaned `aria-expanded` control claiming that content is open

### Requirement: Agents and Toolsets content window is conditional
The merged Agents & Toolsets row SHALL render the existing Agents & Toolsets content window only when at least one agent or toolset is selected, while its Add action SHALL remain visible regardless of selection count.

#### Scenario: No agents or toolsets selected
- **WHEN** the `agentsAndToolsets` selection is empty
- **THEN** the merged Agents & Toolsets Add action SHALL be visible and enabled unless the editor is read-only
- **AND** the Agents & Toolsets content window SHALL not be rendered

#### Scenario: Agent or toolset selected
- **WHEN** the `agentsAndToolsets` selection contains at least one agent or toolset
- **THEN** the existing chip content window SHALL be rendered with its current styles and behavior
- **AND** the Add action SHALL remain visible in the row header

#### Scenario: Last agent or toolset removed
- **WHEN** a user removes the last selected agent or toolset
- **THEN** the `agentsAndToolsets` form value SHALL become empty
- **AND** the Agents & Toolsets content window SHALL be removed without changing unrelated context settings

### Requirement: Add-ons follows the target visual hierarchy
The Add-ons card SHALL be visually separated from Instructions and SHALL use a larger section heading, smaller semibold row titles, and readable secondary descriptions with consistent vertical spacing between rows. A row's description SHALL be shown only while that row has no selections.

#### Scenario: Add-ons card spacing
- **WHEN** Instructions and Add-ons are rendered in the primary editor column
- **THEN** a visible gap SHALL separate the two cards
- **AND** the Add-ons content SHALL not be separated by a horizontal rule from Instructions

#### Scenario: Add-ons row typography
- **WHEN** the Add-ons rows are rendered
- **THEN** the Add-ons heading SHALL have the section-level heading hierarchy
- **AND** Skills and Agents & Toolsets SHALL use the row-title hierarchy shown in the target design
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

## ADDED Requirements

### Requirement: Agents and Toolsets has no JSON view
The Agents & Toolsets row SHALL NOT offer a JSON view. The editor SHALL NOT render a JSON toggle, a JSON editor, Save JSON or Discard actions, or a discard-JSON confirmation for agents and toolsets, and saving SHALL preserve existing `tool_sets` entries that the chip view can represent, including inline toolsets without a `deployment_id`.

#### Scenario: No JSON affordance in any state
- **WHEN** the Add-ons section is rendered, in editable or read-only mode, with or without selected agents or toolsets
- **THEN** no JSON toggle, JSON editor, Save JSON action, or Discard action SHALL be rendered for Agents & Toolsets

#### Scenario: Existing inline toolset is preserved on save
- **WHEN** an application whose saved `tool_sets` contain an inline toolset without a `deployment_id` is loaded and then saved without changing agents or toolsets
- **THEN** the inline toolset SHALL be shown as a chip in the Agents & Toolsets row
- **AND** the saved `tool_sets` SHALL still contain that inline toolset configuration

#### Scenario: Code interpreter is saved independently of agents and toolsets
- **WHEN** the code interpreter setting is enabled or disabled and the application is saved
- **THEN** the saved `tool_sets` SHALL include or omit the code interpreter toolset accordingly
- **AND** the remaining `tool_sets` entries SHALL be built from the `agentsAndToolsets` form value
