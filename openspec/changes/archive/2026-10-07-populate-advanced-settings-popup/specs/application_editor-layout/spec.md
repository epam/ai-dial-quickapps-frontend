# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Advanced opens an empty settings popup`
- TO: `### Requirement: Advanced opens the Advanced Settings popup`

- FROM: `### Requirement: Settings shell has no external data contract`
- TO: `### Requirement: Settings popup changes form state only on Save`

## MODIFIED Requirements

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

### Requirement: Settings popup changes form state only on Save
The Settings row SHALL own only transient popup visibility in local component state. The popup SHALL own its in-progress values as a local draft and SHALL change the Quick App form state (`useQuickApp2Form`) only when Save is activated. Neither SHALL introduce a context, host message, or chat-api endpoint; persistence SHALL happen only through the editor's existing save and auto-save.

#### Scenario: Existing form contract is preserved
- **WHEN** a user opens the popup and closes it without saving
- **THEN** model, temperature, process-files, Time awareness, Built-in file tools, and max attachments form values SHALL remain unchanged
- **AND** no chat-api endpoint SHALL be called because of the Settings row or popup
- **AND** the editor's existing memoisation and dirty-state behavior SHALL remain unchanged

#### Scenario: Saved popup values persist through the editor save
- **WHEN** a user saves the popup and the editor later saves the application
- **THEN** the saved application SHALL contain the popup values in the existing persisted fields
- **AND** no additional chat-api request SHALL be made beyond the editor's existing application update

## ADDED Requirements

### Requirement: Advanced Settings controls live only in the popup
The primary content column SHALL NOT render a standalone Advanced settings (Time awareness) section, a File tools control inside Context and tools, or a max attachments control inside User attachments. These settings SHALL be editable only from the Advanced Settings popup.

#### Scenario: Main column without moved controls
- **WHEN** the editor renders its primary content column
- **THEN** no Time awareness switch, File tools switch, or max attachments input SHALL be rendered there
- **AND** Context and tools SHALL keep its other controls (context files, Code interpreter, Add attachment, Web fetch) with their existing visibility
- **AND** User attachments SHALL keep its Attachment types control
