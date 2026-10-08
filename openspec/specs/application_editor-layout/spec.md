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

The Configuration area SHALL contain the model selector, presented as the **Default model** block defined by `orchestrator_model-selection`. It SHALL NOT render an inline temperature control or process-files control; both are edited only in the Advanced Settings popup (`application_advanced-settings`). Directly below the Default model block, Configuration SHALL render the Settings row followed directly by the Attachments row defined by `application_user-attachments`.

#### Scenario: Existing model configuration is displayed

- **WHEN** the editor loads an application with a resolved model
- **THEN** Configuration SHALL display the Default model block, then the Settings row, then the Attachments row
- **AND** changing the model SHALL update the existing `model` form value

#### Scenario: No inline temperature or process-files controls

- **WHEN** the editor renders Configuration for a model that supports temperature and accepts attachments
- **THEN** no Temperature slider and no "Allow orchestrator to process files" switch SHALL be rendered in Configuration
- **AND** no "Process files" block title or `TemperatureDescription` text SHALL be rendered there

#### Scenario: Settings and Attachments order

- **WHEN** the editor renders Configuration
- **THEN** the Attachments row SHALL be rendered immediately after the Settings row

### Requirement: Instructions is standalone and always visible
The editor SHALL render the existing Instructions editor in a standalone, always-visible section. The Instructions section SHALL NOT be wrapped in a collapsible Orchestrator control, and no empty Orchestrator wrapper SHALL be rendered.

#### Scenario: Instructions is always available
- **WHEN** the editor first renders
- **THEN** the existing Instructions editor SHALL be displayed without activating a section control
- **AND** no `aria-expanded` control for Instructions or Orchestrator SHALL be exposed
- **AND** the model selector SHALL remain in Configuration

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
The editor SHALL render an Add-ons section directly below Instructions. The section SHALL contain a Skills row, one merged Agents & Toolsets row, and a Conversation starters row (defined by `application_conversation-starters`), in that order. Each row SHALL show its title and its action together in a row header. The Skills and Agents & Toolsets Add actions SHALL open that row's existing selection modal. The Conversation starters action SHALL open the Set up conversation starters modal. The primary content column SHALL NOT render a separate Conversation starters section.

#### Scenario: Empty Add-ons section
- **WHEN** the editor loads with no selected skills, no selected agents or toolsets, and no conversation starters
- **THEN** the Add-ons heading SHALL be visible below Instructions
- **AND** the Skills, merged Agents & Toolsets and Conversation starters rows SHALL each display their Add action in the row header
- **AND** no row SHALL display its populated content window

#### Scenario: Add action opens the selection modal
- **WHEN** a user activates the Add action of the Skills row or the Agents & Toolsets row in an editable editor
- **THEN** the existing selection modal for that row SHALL open
- **AND** confirming the modal SHALL update the corresponding `agentSkills` or `agentsAndToolsets` form value and close the modal

#### Scenario: No standalone starters section
- **WHEN** the editor renders its primary content column
- **THEN** no collapsible Conversation starters section SHALL be rendered outside the Add-ons card

#### Scenario: Add-on labels and localization
- **WHEN** the Add-ons section is rendered in any supported locale
- **THEN** user-visible section and row labels SHALL be translated through the `quickAppEditor` namespace keys `AddOns`, `Skills`, `AgentsAndToolsets`, and `ConversationStarters`
- **AND** the Add action label and tooltips SHALL use existing `common`/`quickAppEditor` keys, and the Manage action SHALL use `quickAppEditor` key `Manage`
- **AND** no user-visible label SHALL be hardcoded in the component

#### Scenario: Add-ons accessibility
- **WHEN** a keyboard or assistive-technology user reaches the Add-ons section
- **THEN** the section and rows SHALL expose meaningful translated headings/labels
- **AND** the Add and Manage actions SHALL remain keyboard reachable and have button semantics
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
- **AND** the Add action SHALL remain visible in the row header

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

### Requirement: Configuration exposes a Settings entry point
The Configuration area SHALL retain its existing model controls and render a translated Settings row with a trailing Advanced action.

#### Scenario: Settings row is visible
- **WHEN** the Quick App editor renders its Configuration area
- **THEN** the existing model controls remain available
- **AND** a Settings row is rendered with the translated `quickAppEditor.Settings` label
- **AND** the row exposes a translated Advanced action using `quickAppEditor.Advanced`

#### Scenario: Read-only Configuration
- **WHEN** the editor is read-only or the application is shared
- **THEN** the Advanced action SHALL be disabled
- **AND** activating it SHALL not open the popup or change form state

### Requirement: Advanced opens the Advanced Settings popup
Activating the Advanced action SHALL open an accessible Advanced Settings popup whose body contains the settings controls defined by `application_advanced-settings`.

#### Scenario: Open the popup
- **WHEN** a user activates the enabled Advanced action
- **THEN** a modal popup SHALL be shown with the translated `quickAppEditor.AdvancedSettings` title
- **AND** the popup SHALL provide a visible header close control
- **AND** the popup body SHALL contain the Advanced Settings controls defined by `application_advanced-settings`

#### Scenario: Close without saving
- **WHEN** a user activates the popup close control, the Close footer action, outside dismissal, or the keyboard dismissal behavior
- **THEN** the popup SHALL close
- **AND** no Quick App form value, dirty state, or saved application value SHALL change

#### Scenario: Save the popup
- **WHEN** a user activates the Save footer action with valid popup values
- **THEN** the popup SHALL close
- **AND** the popup values SHALL be applied to the Quick App form as defined by `application_advanced-settings`
- **AND** the popup itself SHALL make no chat-api request or persistence operation

### Requirement: Settings presentation follows the editor visual and direction contract
The Settings row and popup SHALL use the editor's existing themed surfaces, typography, spacing, and UI-kit modal/button treatment, with logical alignment that follows the active document direction.

#### Scenario: Desktop visual hierarchy
- **WHEN** the editor is rendered at the desktop layout breakpoint
- **THEN** the Settings title SHALL align with the Configuration section hierarchy
- **AND** the Advanced action SHALL remain aligned to the row's trailing edge
- **AND** the popup SHALL present a distinct themed surface with a header, a body holding the Advanced Settings controls, and a footer matching the supplied design direction

#### Scenario: Narrow or right-to-left presentation
- **WHEN** the editor is rendered below the desktop breakpoint or with an RTL locale
- **THEN** the Settings row and popup SHALL remain usable without horizontal overflow
- **AND** trailing/leading spacing SHALL follow document direction through logical layout
- **AND** the symmetric settings icon SHALL not be mirrored

### Requirement: Settings UI is localized and accessible
All new user-visible strings SHALL be translated, and the Settings action and popup SHALL be operable and named for keyboard and assistive-technology users.

#### Scenario: Translated labels and actions
- **WHEN** the Settings UI is rendered
- **THEN** its visible labels SHALL use the `quickAppEditor` namespace keys `Settings`, `Advanced`, `AdvancedSettings`, `Close`, and `Save`
- **AND** the popup close control SHALL use the translated `quickAppEditor.CloseAdvancedSettings` accessible name
- **AND** no new visible label SHALL be hardcoded in the component

#### Scenario: Keyboard popup interaction
- **WHEN** a keyboard user reaches the Advanced action and activates it
- **THEN** focus SHALL be managed by the modal implementation
- **AND** the popup SHALL expose a dialog role and accessible name
- **AND** the header close and footer actions SHALL be keyboard reachable

### Requirement: Settings popup changes form state only on Save
The Settings row SHALL own only transient popup visibility in local component state. The popup SHALL own its in-progress values as a local draft and SHALL change the Quick App form state (`useQuickApp2Form`) only when Save is activated. This applies to every popup control, including temperature and process files. Neither SHALL introduce a context, host message, or chat-api endpoint; persistence SHALL happen only through the editor's existing save and auto-save.

#### Scenario: Existing form contract is preserved
- **WHEN** a user opens the popup, changes temperature, process files, Time awareness, Built-in file tools or max attachments, and closes it without saving
- **THEN** model, temperature, process-files, Time awareness, Built-in file tools, and max attachments form values SHALL remain unchanged
- **AND** no chat-api endpoint SHALL be called because of the Settings row or popup
- **AND** the editor's existing memoisation and dirty-state behavior SHALL remain unchanged

#### Scenario: Saved popup values persist through the editor save
- **WHEN** a user saves the popup and the editor later saves the application
- **THEN** the saved application SHALL contain the popup values in the existing persisted fields
- **AND** no additional chat-api request SHALL be made beyond the editor's existing application update

### Requirement: Advanced Settings controls live only in the popup
The primary content column SHALL NOT render a standalone Advanced settings (Time awareness) section, a File tools control inside Context and tools, or a max attachments control. These settings SHALL be editable only from the Advanced Settings popup. The primary content column SHALL NOT render a User attachments section; attachment types SHALL be editable only from the Attachments row in Configuration.

#### Scenario: Main column without moved controls
- **WHEN** the editor renders its primary content column
- **THEN** no Time awareness switch, File tools switch, or max attachments input SHALL be rendered there
- **AND** Context and tools SHALL keep its other controls (context files, Code interpreter, Add attachment, Web fetch) with their existing visibility
- **AND** no User attachments section or Attachment types control SHALL be rendered there
