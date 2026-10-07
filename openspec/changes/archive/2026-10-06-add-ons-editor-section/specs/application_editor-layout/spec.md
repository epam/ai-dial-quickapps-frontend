# Spec Delta

## MODIFIED Requirements

### Requirement: Responsive editor columns
The editor SHALL present its primary content and Configuration areas as side-by-side columns when the available viewport supports the desktop layout, and SHALL stack those areas without horizontal overflow when it does not. The primary content column SHALL place the standalone Instructions section first, followed immediately by the Add-ons section, with the remaining existing settings sections after it.

#### Scenario: Desktop editor viewport
- **WHEN** a Quick App editor is rendered at a viewport meeting the desktop layout breakpoint
- **THEN** the primary content area and the Configuration area SHALL be visible as separate columns
- **AND** the Configuration area SHALL be positioned on the right in left-to-right presentation
- **AND** Add-ons SHALL be directly below Instructions in the primary content column

#### Scenario: Narrow editor viewport
- **WHEN** a Quick App editor is rendered below the desktop layout breakpoint
- **THEN** the primary content area and Configuration area SHALL stack in a readable order
- **AND** no editor content SHALL require horizontal scrolling
- **AND** Add-ons SHALL remain directly below Instructions in the primary content flow

#### Scenario: Right-to-left locale
- **WHEN** the active locale is right-to-left
- **THEN** the column arrangement and spacing SHALL follow the document direction
- **AND** Add-ons headings, descriptions, and Add actions SHALL use logical start/end placement
- **AND** directional layout affordances SHALL not remain incorrectly pinned to the left-to-right side

### Requirement: Presentation change preserves form contract
The layout change SHALL preserve existing form state ownership, field names, conditional behavior, read-only behavior, and persistence without introducing new chat-api requests. Skills SHALL continue to use the existing `agentSkills` form value, and the merged Agents & Toolsets control SHALL continue to use the existing `agentsAndToolsets` form value.

#### Scenario: Save after layout reorganization
- **WHEN** a user changes a moved Skills or Agents & Toolsets selection or the instructions and saves
- **THEN** the saved application SHALL contain the same corresponding configuration values as before the reorganization
- **AND** the editor SHALL make no additional chat-api request because of the layout change

#### Scenario: Read-only editor
- **WHEN** the editor is read-only or the application is shared
- **THEN** moved controls SHALL retain their existing disabled/read-only behavior
- **AND** Add actions SHALL not allow a selection modal to be opened

#### Scenario: Existing selections remain visible
- **WHEN** an application loads with one or more skills or agents/toolsets already selected
- **THEN** the corresponding Add-ons content window SHALL be visible
- **AND** the selected chips and their existing remove/configuration behavior SHALL be preserved

## ADDED Requirements

### Requirement: Add-ons section groups add-on controls
The editor SHALL render an Add-ons section directly below Instructions. The section SHALL contain a Skills row and one merged Agents & Toolsets row, each retaining its existing add/select behavior and visible Add action.

#### Scenario: Empty Add-ons section
- **WHEN** the editor loads with no selected skills and no selected agents or toolsets
- **THEN** the Add-ons heading SHALL be visible below Instructions
- **AND** the Skills row and merged Agents & Toolsets row SHALL each display their Add action
- **AND** neither row SHALL display its empty or populated content window

#### Scenario: Add-on labels and localization
- **WHEN** the Add-ons section is rendered in any supported locale
- **THEN** user-visible section and row labels SHALL be translated through the `quickAppEditor` namespace keys `AddOns`, `Skills`, and `AgentsAndToolsets`
- **AND** existing selector tooltips and empty-state strings SHALL continue to use their current `quickAppEditor`/`common` keys
- **AND** no user-visible label SHALL be hardcoded in the component

#### Scenario: Add-ons accessibility
- **WHEN** a keyboard or assistive-technology user reaches the Add-ons section
- **THEN** the section and rows SHALL expose meaningful translated headings/labels
- **AND** the Add actions SHALL remain keyboard reachable and have their existing button semantics
- **AND** hiding an empty content window SHALL not leave an orphaned `aria-expanded` control claiming that content is open

### Requirement: Skills content window is conditional
The Skills row SHALL render the existing Skills content window only when at least one skill is selected, while its Add action SHALL remain visible regardless of selection count.

#### Scenario: No skills selected
- **WHEN** the `agentSkills` selection is empty
- **THEN** the Skills Add action SHALL be visible and enabled unless the editor is read-only
- **AND** the Skills content window SHALL not be rendered

#### Scenario: Skill selected
- **WHEN** the `agentSkills` selection contains at least one skill
- **THEN** the Skills content window SHALL be rendered with the existing chip styles and removal behavior
- **AND** the Skills Add action SHALL remain visible

#### Scenario: Last skill removed
- **WHEN** a user removes the last selected skill
- **THEN** the `agentSkills` form value SHALL become empty
- **AND** the Skills content window SHALL be removed without changing any other form value

### Requirement: Agents and Toolsets content window is conditional
The merged Agents & Toolsets row SHALL render the existing Agents & Toolsets content window only when at least one agent or toolset is selected, while its Add action SHALL remain visible regardless of selection count.

#### Scenario: No agents or toolsets selected
- **WHEN** the `agentsAndToolsets` selection is empty
- **THEN** the merged Agents & Toolsets Add action SHALL be visible and enabled unless the editor is read-only
- **AND** the Agents & Toolsets content window SHALL not be rendered

#### Scenario: Agent or toolset selected
- **WHEN** the `agentsAndToolsets` selection contains at least one agent or toolset
- **THEN** the existing chip content window SHALL be rendered with its current styles and behavior
- **AND** the Add action and existing JSON-view affordance SHALL retain their current behavior

#### Scenario: Last agent or toolset removed
- **WHEN** a user removes the last selected agent or toolset
- **THEN** the `agentsAndToolsets` form value SHALL become empty
- **AND** the Agents & Toolsets content window SHALL be removed without changing unrelated context settings

### Requirement: Add-ons follows the target visual hierarchy
The Add-ons card SHALL be visually separated from Instructions and SHALL use a larger section heading, smaller semibold row titles, and readable secondary descriptions with consistent vertical spacing between rows.

#### Scenario: Add-ons card spacing
- **WHEN** Instructions and Add-ons are rendered in the primary editor column
- **THEN** a visible gap SHALL separate the two cards
- **AND** the Add-ons content SHALL not be separated by a horizontal rule from Instructions

#### Scenario: Add-ons row typography
- **WHEN** the Add-ons rows are rendered
- **THEN** the Add-ons heading SHALL have the section-level heading hierarchy
- **AND** Skills and Agents & Toolsets SHALL use the row-title hierarchy shown in the target design
- **AND** each row description SHALL use secondary body text styling

#### Scenario: Add-ons row spacing
- **WHEN** multiple Add-ons rows are rendered without selected content windows
- **THEN** each row SHALL have consistent vertical whitespace before the next row
- **AND** Add actions SHALL remain aligned with their corresponding row titles

## State, API, rendering, and direction constraints

- State SHALL remain owned by the existing Quick App editor form (`agentSkills` and `agentsAndToolsets`); no new React context or persistent client-side store SHALL be introduced for section visibility.
- This presentation change SHALL call no chat-api endpoint. Existing catalog loading and selection behavior remains unchanged; no new method, path, request payload, or response shape is required.
- Components that are memoized today SHALL remain memoized unless a measured reason requires otherwise; derived visibility SHALL be computed from current form values without duplicating state, and callbacks passed to existing selectors SHALL remain stable where their current contracts require it.
- New layout spacing/alignment SHALL use logical CSS/Tailwind direction utilities. Inherent directional icons SHALL mirror in RTL; the plus icon SHALL remain symmetric and unmirrored.
