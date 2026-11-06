# Spec Delta

## MODIFIED Requirements

### Requirement: Popup lists the Advanced Settings controls

The Advanced Settings popup body SHALL render, in this order: the Temperature slider (when available, see "Temperature in the popup"), a max attachments number input, a Time awareness switch, the Allow orchestrator to process files switch (when available, see "Allow orchestrator to process files in the popup"), and then the Add attachment and Web fetch switches (when enabled, see "Feature toggles in the popup (editable)"). Each control SHALL show its translated label, and each control except the Temperature slider SHALL show its translated helper text.

#### Scenario: Controls and copy

- **WHEN** the Advanced Settings popup opens for a model that supports temperature and accepts attachments
- **THEN** it SHALL first show the Temperature slider labelled `ChatSettingsI18nKeys.TemperatureLabel`
- **AND** a number input labelled with `ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachments` ("Maximum attachments amount user can add") and the hint `ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachmentsHint` ("Valid only for the cases when attachments enabled for the agent") below it, with the placeholder `ApplicationEditorI18nKeys.AdvancedSettingsMaxAttachmentsPlaceholder` ("Enter the maximum number of attachments") while empty
- **AND** a switch labelled `ApplicationEditorI18nKeys.AdvancedSettingsTimeAwareness` ("Time awareness") with the description `ApplicationEditorI18nKeys.AdvancedSettingsTimeAwarenessDescription` ("Gives the agent the current date and time, helping it understand references like \"today,\" deadlines, and schedules.")
- **AND** a switch labelled `ApplicationEditorI18nKeys.AdvancedSettingsProcessFiles` with the description `ApplicationEditorI18nKeys.AdvancedSettingsProcessFilesDescription`
- **AND** any enabled feature toggles after it, in the order Add attachment, Web fetch
- **AND** no Built-in file tools switch SHALL be rendered
- **AND** no visible string in the popup body SHALL be hardcoded in the component

#### Scenario: Conditional controls absent

- **WHEN** the popup opens for a loaded model with no temperature support and no `inputAttachmentTypes`, and no host feature setting is enabled
- **THEN** the body SHALL show only the max attachments input and the Time awareness switch, in that order

#### Scenario: Max attachments hint is informational

- **WHEN** the application has no attachment types configured
- **THEN** the max attachments input SHALL remain editable
- **AND** its value SHALL be kept and saved as entered

### Requirement: Popup edits a draft seeded from the form

Each time the popup opens it SHALL seed a local draft from the current Quick App form values `temperature`, `maxInputAttachments`, `timestamp`, and `processLargeFiles`. Edits SHALL change only the draft until Save.

#### Scenario: Seeded from current values

- **WHEN** the popup opens for an application with temperature `0.7`, Time awareness on, process files on and max attachments 50, whose model supports temperature and accepts attachments
- **THEN** the slider SHALL be at `0.7`, the input SHALL show `50`, the Time awareness switch SHALL be on, and the process files switch SHALL be on

#### Scenario: Draft is discarded on dismissal

- **WHEN** a user changes any popup control (including the Temperature slider or the process files switch) and then closes the popup by the header close control, the Close action, outside dismissal, or Escape
- **THEN** the form values and dirty state SHALL be unchanged
- **AND** reopening the popup SHALL show the form values, not the discarded edits

### Requirement: Save applies the draft to the form

Activating Save with a valid draft SHALL write `temperature`, `maxInputAttachments`, `timestamp`, and `processLargeFiles` to the Quick App form in a single update and close the popup. Values of controls that were not rendered SHALL be written back unchanged. The form SHALL become dirty only if at least one value differs from its saved baseline. Save SHALL NOT call chat-api.

#### Scenario: Save changed values

- **WHEN** a user turns Time awareness off, moves the temperature to `0.3`, and activates Save
- **THEN** the popup SHALL close
- **AND** the form values `timestamp` SHALL be `false` and `temperature` SHALL be `0.3`, and the editor SHALL report a dirty state
- **AND** no chat-api request SHALL be made until the editor's own save or auto-save runs

#### Scenario: Save process files

- **WHEN** a user turns the process files switch off and activates Save
- **THEN** the form value `processLargeFiles` SHALL be `false` and the editor SHALL report a dirty state

#### Scenario: Save without changes

- **WHEN** a user opens the popup and activates Save without changing anything
- **THEN** the popup SHALL close and the dirty state SHALL be unchanged

### Requirement: Values persist through the existing application save

The popup values SHALL be serialized by the editor's existing application save without any change in shape, sent in the chat-api application update request (`@epam/ai-dial-chat-api-client` `updateApplicationBodyDto`):

- `timestamp` → `application_properties.features.timestamp`
- `maxInputAttachments` → the application's `maxInputAttachments`
- `temperature` → `application_properties.orchestrator.deployment.parameters.temperature` (written from the form value when the model supports temperature). For any other model a stored `temperature` SHALL be kept as loaded and no temperature SHALL be added from the form default. Other keys of the loaded `deployment.parameters` (for example `top_p`, `seed`, `stop`, `max_tokens`) SHALL be kept as loaded; `parameters` is omitted only when there is nothing to write. While the selected model is not loaded yet, the loaded `parameters` SHALL be kept and a stored `temperature` SHALL follow the form value.
- `processLargeFiles` → `application_properties.orchestrator.attachment_strategy` (only when the model accepts attachments)

#### Scenario: Saved payload

- **WHEN** the editor saves an application whose form holds `timestamp: true`, `maxInputAttachments: 50`
- **THEN** the update body SHALL contain `maxInputAttachments: 50`
- **AND** `applicationProperties.features.timestamp` SHALL be `{ "injection_strategy": "tool_call" }`
- **AND** `applicationProperties.features` SHALL have no `dial_files` key

#### Scenario: Orchestrator payload

- **WHEN** the editor saves with `temperature: 0.3` and `processLargeFiles: true` for a model with `features.temperature: true` and non-empty `inputAttachmentTypes`
- **THEN** `applicationProperties.orchestrator.deployment.parameters` SHALL be `{ "temperature": 0.3 }`
- **AND** `applicationProperties.orchestrator.attachment_strategy` SHALL be `{ "type": "lazy_on_demand" }`
- **WHEN** `processLargeFiles` is `false` for that model
- **THEN** `applicationProperties.orchestrator.attachment_strategy` SHALL be `null`
- **WHEN** the selected model does not accept attachments
- **THEN** the save SHALL leave `orchestrator.attachment_strategy` as it was in the loaded configuration

#### Scenario: File tools setting is not owned by the editor

- **WHEN** the loaded `features.dial_files` is `{ "tools": ["read_file"] }` and the user changes any popup value and saves
- **THEN** `applicationProperties.features.dial_files` SHALL still be `{ "tools": ["read_file"] }`
- **WHEN** an application is created with default values and saved
- **THEN** `applicationProperties.features` SHALL have no `dial_files` key

#### Scenario: Switches off

- **WHEN** the editor saves with `timestamp: false`
- **THEN** `applicationProperties.features.timestamp` SHALL be `null`
- **AND** other existing `features` keys SHALL be preserved

#### Scenario: Defaults on load

- **WHEN** an application is loaded whose `features` has no `timestamp` key, with no `maxInputAttachments`, no `orchestrator.deployment.parameters.temperature` and no `orchestrator.attachment_strategy`
- **THEN** the popup SHALL show the temperature at `0.5`, Time awareness on, process files on (when shown), and an empty max attachments input

#### Scenario: Other deployment parameters are kept

- **WHEN** the loaded `orchestrator.deployment.parameters` is `{ "temperature": 0.2, "top_p": 1, "seed": 7 }` and the editor saves with `temperature: 0.3` for a model with `features.temperature: true`
- **THEN** `applicationProperties.orchestrator.deployment.parameters` SHALL be `{ "temperature": 0.3, "top_p": 1, "seed": 7 }`

#### Scenario: Model without temperature keeps other parameters

- **WHEN** the loaded `parameters` is `{ "temperature": 0.2, "seed": 7 }` and the selected model does not support temperature
- **THEN** the saved `parameters` SHALL be `{ "temperature": 0.2, "seed": 7 }`

#### Scenario: No temperature is invented for a model without support

- **WHEN** the loaded `parameters` is `{ "seed": 7 }` (or absent) and the selected model does not support temperature
- **THEN** the saved `parameters` SHALL be `{ "seed": 7 }` (or the saved `orchestrator.deployment` SHALL have no `parameters` key), although the form holds the default `0.5`

#### Scenario: Selected model not loaded keeps parameters

- **WHEN** the selected model is not yet in the loaded models and the editor builds the configuration
- **THEN** `orchestrator.deployment.parameters` SHALL keep every loaded key, and a stored `temperature` taken from the form value (the loaded one unless the user changed it)

### Requirement: Advanced Settings is accessible and direction-aware

The popup controls SHALL be keyboard-operable and named, and SHALL follow the document direction.

#### Scenario: Keyboard and names

- **WHEN** a keyboard user tabs through the open popup with all controls shown
- **THEN** focus SHALL reach the Temperature slider, the temperature value input, the max attachments input, the Time awareness switch, the process files switch, then the footer actions, in that order
- **AND** the input SHALL have an accessible name from its label and an accessible description from its hint
- **AND** each switch SHALL expose a switch role, its checked state, and an accessible name from its label

#### Scenario: Popup width

- **WHEN** the popup opens at the desktop breakpoint (`md` and up)
- **THEN** the popup SHALL be at most `586px` wide, so the Temperature slider and its value input fit on one row
- **AND** below the breakpoint it SHALL use the full available width without horizontal overflow

#### Scenario: Right-to-left document

- **WHEN** the document direction is `rtl` (as when an RTL locale is active — none ships yet, see `i18n`)
- **THEN** labels, hints, and switches SHALL align to the logical start edge using logical spacing
- **AND** the slider SHALL fill from the logical start edge, and the temperature value input SHALL sit on the logical end side of the track
- **AND** no icon in the popup body SHALL be mirrored

### Requirement: Allow orchestrator to process files in the popup

The Advanced Settings popup SHALL show the orchestrator attachment strategy as its last body control: a kit `Switch` labelled `ApplicationEditorI18nKeys.AdvancedSettingsProcessFiles` ("Process files"), with the caption `ApplicationEditorI18nKeys.AdvancedSettingsProcessFilesDescription` ("Agent will handle attachments by reading file content on demand instead of including all attachment content in the initial prompt."). It SHALL edit the draft `processLargeFiles` value, which is seeded from the form field `processLargeFiles`. On load that field is read as stored when `application_properties.orchestrator.attachment_strategy` is present (`true` when set, `false` when saved as off) and defaults to `true` when the key is absent, as for a new application.

#### Scenario: Shown only for models that accept attachments

- **WHEN** the selected model has a non-empty `inputAttachmentTypes`
- **THEN** the popup SHALL render the switch after the Time awareness switch
- **WHEN** the selected model has no `inputAttachmentTypes`, or it is not loaded
- **THEN** the popup SHALL NOT render the switch

#### Scenario: Toggling the draft

- **WHEN** the user turns the switch on by pointer or keyboard (Space)
- **THEN** the switch SHALL show on
- **AND** the form `processLargeFiles` value SHALL stay unchanged until Save

#### Scenario: No block title or long description

- **WHEN** the switch is rendered
- **THEN** no "Process files" title and no separate process-files description SHALL be rendered
