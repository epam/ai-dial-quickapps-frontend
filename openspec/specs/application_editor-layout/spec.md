# Application Editor Layout Specification

## Purpose

Defines the Quick App editor composition so primary instructions remain distinct from model and related configuration while preserving existing form behavior, saved values, and direction-aware presentation.

## Requirements

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

### Requirement: Configuration contains existing model controls
The Configuration area SHALL contain the existing model selector, temperature control when supported by the selected model, and process-files control when that feature is available, without changing their values or conditional visibility.

#### Scenario: Existing model configuration is displayed
- **WHEN** the editor loads an application with a resolved model
- **THEN** Configuration SHALL display the same model selector and temperature control behavior currently provided by the editor
- **AND** changing either control SHALL update the corresponding existing form value

#### Scenario: Temperature is unsupported
- **WHEN** the selected model does not support temperature
- **THEN** Configuration SHALL omit the temperature control as it does currently

#### Scenario: Process-files feature is unavailable
- **WHEN** the selected model or environment does not make process-file handling available
- **THEN** Configuration SHALL omit the process-files control as it does currently

### Requirement: Instructions is standalone and always visible
The editor SHALL render the existing Instructions editor in a standalone, always-visible section. The Instructions section SHALL NOT be wrapped in a collapsible Orchestrator control, and no empty Orchestrator wrapper SHALL be rendered.

#### Scenario: Instructions is always available
- **WHEN** the editor first renders
- **THEN** the existing Instructions editor SHALL be displayed without activating a section control
- **AND** no `aria-expanded` control for Instructions or Orchestrator SHALL be exposed
- **AND** the model selector, temperature control, and process-files control SHALL remain in Configuration

#### Scenario: Instructions is marked as required
- **WHEN** the Instructions section heading is rendered
- **THEN** it SHALL display a visual required marker next to the heading text
- **AND** the visual marker SHALL be hidden from assistive technology
- **AND** assistive technology SHALL instead announce a required label translated through the `common` namespace key `(required)`
- **AND** the marker SHALL be presentational only: it SHALL NOT add form validation, and an application with empty Instructions SHALL remain savable as before

#### Scenario: Instructions value is edited
- **WHEN** a user edits the Instructions editor
- **THEN** the existing instructions form value SHALL be updated
- **AND** the value SHALL continue to participate in the existing validation, dirty-state, and save serialization behavior

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

### Requirement: Editor sections share a card presentation
The Instructions and Add-ons sections SHALL be rendered with the same card presentation: a raised rounded surface, a section-level heading, and consistent spacing between the heading and the section content. Each card SHALL be exposed as a section labelled by its translated heading. Spacing between cards in the primary content column SHALL come from the column layout rather than from an individual card's own margin.

#### Scenario: Shared card appearance
- **WHEN** Instructions and Add-ons are rendered in the primary editor column
- **THEN** both SHALL use the same card surface, corner radius, elevation, padding, and heading typography
- **AND** each section SHALL expose an accessible name equal to its translated heading

#### Scenario: Card spacing comes from the column
- **WHEN** the primary editor column renders its cards
- **THEN** the gap between adjacent cards SHALL be uniform and defined by the column layout
- **AND** omitting or reordering a card SHALL not leave a stray leading or trailing margin

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
