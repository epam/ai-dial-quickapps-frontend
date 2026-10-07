# Application Advanced Settings Specification

## Purpose

Defines the content of the Quick App editor's Advanced Settings popup (opened from the Settings row in Configuration, see `application_editor-layout`): the max attachments input, the Time awareness switch and the Built-in file tools switch, how the popup edits a local draft and applies it to the editor form state (`useQuickApp2Form`: `maxInputAttachments`, `timestamp`, `fileTools`) on Save, validation, and how the values load from and save through the existing application update. No context or chat-api endpoint of its own.

## Requirements

### Requirement: Popup lists the Advanced Settings controls
The Advanced Settings popup body SHALL render, in this order: a max attachments number input, a Time awareness switch, and a Built-in file tools switch. Each control SHALL show its translated label and helper text.

#### Scenario: Controls and copy
- **WHEN** the Advanced Settings popup opens
- **THEN** it SHALL show a number input labelled with `quickAppEditor.MaxAttachmentsUserCanAdd` ("Maximum attachments amount user can add") and the hint `quickAppEditor.MaxAttachmentsHint` ("Valid only for the cases when attachments enabled for the agent") below it
- **AND** a switch labelled `quickAppEditor.TimeAwareness` ("Time awareness") with the description `quickAppEditor.TimeAwarenessDescription` ("Gives the agent the current date and time, helping it understand references like \"today,\" deadlines, and schedules.")
- **AND** a switch labelled `quickAppEditor.BuiltInFileTools` ("Built-in file tools") with the description `quickAppEditor.BuiltInFileToolsDescription` ("Lets the agent browse, search, read, and edit files within the app's file context. Includes write access, so worth reviewing for agents handling sensitive files.")
- **AND** no visible string in the popup body SHALL be hardcoded in the component

#### Scenario: Max attachments hint is informational
- **WHEN** the application has no attachment types configured
- **THEN** the max attachments input SHALL remain editable
- **AND** its value SHALL be kept and saved as entered

### Requirement: Popup edits a draft seeded from the form
Each time the popup opens it SHALL seed a local draft from the current Quick App form values `maxInputAttachments`, `timestamp`, and `fileTools`. Edits SHALL change only the draft until Save.

#### Scenario: Seeded from current values
- **WHEN** the popup opens for an application with Time awareness on, Built-in file tools off and max attachments 50
- **THEN** the input SHALL show `50`, the Time awareness switch SHALL be on, and the Built-in file tools switch SHALL be off

#### Scenario: Draft is discarded on dismissal
- **WHEN** a user changes any popup control and then closes the popup by the header close control, the Close action, outside dismissal, or Escape
- **THEN** the form values and dirty state SHALL be unchanged
- **AND** reopening the popup SHALL show the form values, not the discarded edits

### Requirement: Save applies the draft to the form
Activating Save with a valid draft SHALL write `maxInputAttachments`, `timestamp`, and `fileTools` to the Quick App form in a single update and close the popup. The form SHALL become dirty only if at least one value differs from its saved baseline. Save SHALL NOT call chat-api.

#### Scenario: Save changed values
- **WHEN** a user turns Built-in file tools on and activates Save
- **THEN** the popup SHALL close
- **AND** the form value `fileTools` SHALL be `true` and the editor SHALL report a dirty state
- **AND** no chat-api request SHALL be made until the editor's own save or auto-save runs

#### Scenario: Save without changes
- **WHEN** a user opens the popup and activates Save without changing anything
- **THEN** the popup SHALL close and the dirty state SHALL be unchanged

### Requirement: Max attachments is validated before Save
The max attachments draft SHALL accept an empty value or a positive integer, using the same rule as the form schema (`MaxInputAttachmentsSchema`). An invalid value SHALL block Save.

#### Scenario: Empty value
- **WHEN** the input is cleared and the user activates Save
- **THEN** the form value `maxInputAttachments` SHALL become empty and the saved application SHALL omit `maxInputAttachments`

#### Scenario: Invalid value
- **WHEN** the input holds `0` (or any value that is not a positive integer) and the user activates Save
- **THEN** the popup SHALL stay open
- **AND** the input SHALL be marked invalid and show the translated message `quickAppEditor.MaxAttachmentsInvalid` ("Enter a whole number greater than 0"), associated with the input for assistive technology
- **AND** no form value SHALL change

### Requirement: Values persist through the existing application save
The popup values SHALL be serialized by the editor's existing application save without any change in shape: `timestamp` to `application_properties.features.timestamp`, `fileTools` to `application_properties.features.dial_files`, `maxInputAttachments` to the application's `maxInputAttachments`, sent in the chat-api application update request (`@epam/ai-dial-chat-api-client` `updateApplicationBodyDto`).

#### Scenario: Saved payload
- **WHEN** the editor saves an application whose form holds `timestamp: true`, `fileTools: true`, `maxInputAttachments: 50`
- **THEN** the update body SHALL contain `maxInputAttachments: 50`
- **AND** `applicationProperties.features.timestamp` SHALL be `{ "injection_strategy": "tool_call" }`
- **AND** `applicationProperties.features.dial_files` SHALL be `{}`

#### Scenario: Switches off
- **WHEN** the editor saves with `timestamp: false` and `fileTools: false`
- **THEN** `applicationProperties.features.timestamp` and `applicationProperties.features.dial_files` SHALL both be `null`
- **AND** other existing `features` keys SHALL be preserved

#### Scenario: Defaults on load
- **WHEN** an application is loaded whose `features` has no `timestamp` key and no `dial_files` key and no `maxInputAttachments`
- **THEN** the popup SHALL show Time awareness on, Built-in file tools off, and an empty max attachments input

### Requirement: Advanced Settings is accessible and direction-aware
The popup controls SHALL be keyboard-operable and named, and SHALL follow the document direction.

#### Scenario: Keyboard and names
- **WHEN** a keyboard user tabs through the open popup
- **THEN** focus SHALL reach the max attachments input, the Time awareness switch, the Built-in file tools switch, then the footer actions, in that order
- **AND** the input SHALL have an accessible name from its label and an accessible description from its hint
- **AND** each switch SHALL expose a switch role, its checked state, and an accessible name from its label

#### Scenario: Right-to-left locale
- **WHEN** the active locale is RTL
- **THEN** labels, hints, and switches SHALL align to the logical start edge using logical spacing
- **AND** no icon in the popup body SHALL be mirrored
