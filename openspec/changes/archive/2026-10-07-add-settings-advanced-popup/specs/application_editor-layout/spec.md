# Spec Delta

## ADDED Requirements

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

### Requirement: Advanced opens an empty settings popup
Activating the Advanced action SHALL open an accessible Advanced Settings popup whose body has no settings controls in this increment.

#### Scenario: Open the popup
- **WHEN** a user activates the enabled Advanced action
- **THEN** a modal popup SHALL be shown with the translated `quickAppEditor.AdvancedSettings` title
- **AND** the popup SHALL provide a visible header close control
- **AND** the popup body SHALL be empty of settings controls

#### Scenario: Close without settings
- **WHEN** a user activates the popup close control, the Close shell action, outside dismissal, or the keyboard dismissal behavior
- **THEN** the popup SHALL close
- **AND** no Quick App form value, dirty state, or saved application value SHALL change

#### Scenario: Save empty shell
- **WHEN** a user activates the Save shell action while the popup body is empty
- **THEN** the popup SHALL close
- **AND** no chat-api request or persistence operation SHALL occur

### Requirement: Settings presentation follows the editor visual and direction contract
The Settings row and popup SHALL use the editor's existing themed surfaces, typography, spacing, and UI-kit modal/button treatment, with logical alignment that follows the active document direction.

#### Scenario: Desktop visual hierarchy
- **WHEN** the editor is rendered at the desktop layout breakpoint
- **THEN** the Settings title SHALL align with the Configuration section hierarchy
- **AND** the Advanced action SHALL remain aligned to the row's trailing edge
- **AND** the popup SHALL present a distinct themed surface with a header, empty body, and footer matching the supplied design direction

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

### Requirement: Settings shell has no external data contract
The Settings shell SHALL own only transient popup visibility in local component state and SHALL not introduce a context, form field, persistence field, host message, or chat-api endpoint.

#### Scenario: Existing form contract is preserved
- **WHEN** a user opens, saves, or closes the empty popup
- **THEN** existing model, temperature, process-files, and legacy Advanced settings values SHALL remain unchanged
- **AND** no chat-api endpoint SHALL be called because of the Settings shell
- **AND** the editor's existing memoisation and dirty-state behavior SHALL remain unchanged
