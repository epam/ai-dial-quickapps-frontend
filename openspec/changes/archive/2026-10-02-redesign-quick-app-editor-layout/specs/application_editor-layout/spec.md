# Spec Delta

## Purpose

Defines the Quick App editor's responsive presentation so primary instructions remain distinct from model and related configuration while preserving the existing form behavior and saved data contract.

## ADDED Requirements

### Requirement: Responsive editor columns
The editor SHALL present its primary content and Configuration areas as side-by-side columns when the available viewport supports the desktop layout, and SHALL stack those areas without horizontal overflow when it does not.

#### Scenario: Desktop editor viewport
- **WHEN** a Quick App editor is rendered at a viewport meeting the desktop layout breakpoint
- **THEN** the primary content area and the Configuration area SHALL be visible as separate columns
- **AND** the Configuration area SHALL be positioned on the right in left-to-right presentation

#### Scenario: Narrow editor viewport
- **WHEN** a Quick App editor is rendered below the desktop layout breakpoint
- **THEN** the primary content area and Configuration area SHALL stack in a readable order
- **AND** no editor content SHALL require horizontal scrolling

#### Scenario: Right-to-left locale
- **WHEN** the active locale is right-to-left
- **THEN** the column arrangement and spacing SHALL follow the document direction
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

#### Scenario: Instructions value is edited
- **WHEN** a user edits the Instructions editor
- **THEN** the existing instructions form value SHALL be updated
- **AND** the value SHALL continue to participate in the existing validation, dirty-state, and save serialization behavior

### Requirement: Presentation change preserves form contract
The layout change SHALL preserve existing form state ownership, field names, conditional behavior, read-only behavior, and persistence without introducing new API requests.

#### Scenario: Save after layout reorganization
- **WHEN** a user changes a moved configuration control or the instructions and saves
- **THEN** the saved application SHALL contain the same corresponding configuration values as before the reorganization
- **AND** the editor SHALL make no additional chat-api request because of the layout change

#### Scenario: Read-only editor
- **WHEN** the editor is read-only or the application is shared
- **THEN** moved controls SHALL retain their existing disabled/read-only behavior
