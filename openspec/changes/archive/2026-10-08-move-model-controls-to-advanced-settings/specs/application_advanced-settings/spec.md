## ADDED Requirements

### Requirement: Temperature in the popup
The Advanced Settings popup SHALL show the orchestrator temperature as the first body control, using the kit 2.0 `Slider`, only when the selected model supports temperature. The slider SHALL edit the draft `temperature` value, which is seeded from the form field `temperature` (`useQuickApp2Form`, default `1` via `DEFAULT_TEMPERATURE`, loaded from `application_properties.orchestrator.deployment.parameters.temperature`). The visibility check SHALL be the existing `doesModelAllowTemperature` against `DataContext`'s `modelsMap`, memoised with `useMemo` as today. No other memoisation is required.

#### Scenario: Slider presentation
- **WHEN** the popup opens for a model with `features.temperature: true` and form `temperature` `0.5`
- **THEN** the slider SHALL be labelled above the track with `quickAppEditor.Temperature` ("Temperature")
- **AND** it SHALL range from `0` to `1` in steps of `0.1`
- **AND** tick marks SHALL be derived from that step: exactly 10, one per `0.1` step after `0` (0.1 … 1.0), with no finer grid such as the `0.05` spacing drawn in the mockup frame. Tick count and colour (`Controls/Stroke/Accent-focus`, `--stroke-accent-focus`) come from the ui-kit `Slider`; the app does not restyle them
- **AND** a bubble above the thumb SHALL show the scale label for the current value: `quickAppEditor.TemperaturePrecise` ("Precise") for `0`–`0.3`, `quickAppEditor.TemperatureNeutral` ("Neutral") for `0.4`–`0.6`, `quickAppEditor.TemperatureCreative` ("Creative") for `0.7`–`1`
- **AND** a compact number input named `quickAppEditor.TemperatureValue` ("Temperature value") SHALL show the value with one decimal (`0.5`) on the logical end side of the track
- **AND** neither `quickAppEditor.TemperatureDescription` nor scale labels below the track SHALL be rendered

#### Scenario: Changing the draft temperature
- **WHEN** the user moves the slider to `0.3`
- **THEN** the bubble SHALL show "Precise" and the value input `0.3`
- **AND** the form `temperature` value SHALL stay unchanged until Save

#### Scenario: Model without temperature support
- **WHEN** the selected model is loaded and its `features.temperature` is not `true`
- **THEN** the popup SHALL NOT render the Temperature slider
- **AND** on save `orchestrator.deployment.parameters` SHALL be omitted, so no temperature is sent

#### Scenario: Selected model not loaded yet
- **WHEN** the selected model id is not in the loaded models
- **THEN** the popup SHALL render the Temperature slider

#### Scenario: Temperature accessibility
- **WHEN** a keyboard or assistive-technology user reaches the slider
- **THEN** it SHALL expose a slider role named by `quickAppEditor.Temperature`, with `aria-valuenow` equal to the numeric value and `aria-valuetext` equal to the current scale label
- **AND** arrow keys SHALL change the value by one step
- **AND** the value input SHALL be the next focus stop after the slider

#### Scenario: Typing a temperature
- **WHEN** the user types `0.36` into the value input
- **THEN** the draft temperature SHALL become `0.4` (clamped to `0`–`1` and snapped to the `0.1` step) and the slider and bubble SHALL follow
- **AND** the input SHALL keep showing the typed text until it loses focus, then show `0.4`
- **AND** an empty input SHALL leave the draft temperature unchanged
- **AND** the form `temperature` value SHALL stay unchanged until Save

### Requirement: Allow orchestrator to process files in the popup
The Advanced Settings popup SHALL show the orchestrator attachment strategy as its last body control: a kit `Switch` labelled `quickAppEditor.AllowOrchestratorToProcessFiles` ("Allow orchestrator to process files"), with the caption `quickAppEditor.ProcessFilesOnDemandDescription` ("Handle attachments by reading file content on demand instead of including all attachment content in the initial prompt."). It SHALL edit the draft `processLargeFiles` value, which is seeded from the form field `processLargeFiles`. On load that field is `true` when `application_properties.orchestrator.attachment_strategy` is set, and `false` otherwise.

#### Scenario: Shown only for models that accept attachments
- **WHEN** the selected model has a non-empty `inputAttachmentTypes`
- **THEN** the popup SHALL render the switch after the Built-in file tools switch
- **WHEN** the selected model has no `inputAttachmentTypes`, or it is not loaded
- **THEN** the popup SHALL NOT render the switch

#### Scenario: Toggling the draft
- **WHEN** the user turns the switch on by pointer or keyboard (Space)
- **THEN** the switch SHALL show on
- **AND** the form `processLargeFiles` value SHALL stay unchanged until Save

#### Scenario: No block title or long description
- **WHEN** the switch is rendered
- **THEN** no `quickAppEditor.ProcessFiles` ("Process files") title and no `quickAppEditor.ProcessFilesDescription` text SHALL be rendered

## MODIFIED Requirements

### Requirement: Popup lists the Advanced Settings controls
The Advanced Settings popup body SHALL render, in this order: the Temperature slider (when available, see "Temperature in the popup"), a max attachments number input, a Time awareness switch, a Built-in file tools switch, and the Allow orchestrator to process files switch (when available, see "Allow orchestrator to process files in the popup"). Each control SHALL show its translated label, and each control except the Temperature slider SHALL show its translated helper text.

#### Scenario: Controls and copy
- **WHEN** the Advanced Settings popup opens for a model that supports temperature and accepts attachments
- **THEN** it SHALL first show the Temperature slider labelled `quickAppEditor.Temperature`
- **AND** a number input labelled with `quickAppEditor.MaxAttachmentsUserCanAdd` ("Maximum attachments amount user can add") and the hint `quickAppEditor.MaxAttachmentsHint` ("Valid only for the cases when attachments enabled for the agent") below it, with the placeholder `quickAppEditor.MaxAttachmentsPlaceholder` ("Enter the maximum number of attachments") while empty
- **AND** a switch labelled `quickAppEditor.TimeAwareness` ("Time awareness") with the description `quickAppEditor.TimeAwarenessDescription` ("Gives the agent the current date and time, helping it understand references like \"today,\" deadlines, and schedules.")
- **AND** a switch labelled `quickAppEditor.BuiltInFileTools` ("Built-in file tools") with the description `quickAppEditor.BuiltInFileToolsDescription` ("Lets the agent browse, search, read, and edit files within the app's file context. Includes write access, so worth reviewing for agents handling sensitive files.")
- **AND** finally a switch labelled `quickAppEditor.AllowOrchestratorToProcessFiles` with the description `quickAppEditor.ProcessFilesOnDemandDescription`
- **AND** no visible string in the popup body SHALL be hardcoded in the component

#### Scenario: Conditional controls absent
- **WHEN** the popup opens for a loaded model with no temperature support and no `inputAttachmentTypes`
- **THEN** the body SHALL show only the max attachments input, the Time awareness switch and the Built-in file tools switch, in that order

#### Scenario: Max attachments hint is informational
- **WHEN** the application has no attachment types configured
- **THEN** the max attachments input SHALL remain editable
- **AND** its value SHALL be kept and saved as entered

### Requirement: Popup edits a draft seeded from the form
Each time the popup opens it SHALL seed a local draft from the current Quick App form values `temperature`, `maxInputAttachments`, `timestamp`, `fileTools`, and `processLargeFiles`. Edits SHALL change only the draft until Save.

#### Scenario: Seeded from current values
- **WHEN** the popup opens for an application with temperature `0.7`, Time awareness on, Built-in file tools off, process files on and max attachments 50, whose model supports temperature and accepts attachments
- **THEN** the slider SHALL be at `0.7`, the input SHALL show `50`, the Time awareness switch SHALL be on, the Built-in file tools switch SHALL be off, and the process files switch SHALL be on

#### Scenario: Draft is discarded on dismissal
- **WHEN** a user changes any popup control (including the Temperature slider or the process files switch) and then closes the popup by the header close control, the Close action, outside dismissal, or Escape
- **THEN** the form values and dirty state SHALL be unchanged
- **AND** reopening the popup SHALL show the form values, not the discarded edits

### Requirement: Save applies the draft to the form
Activating Save with a valid draft SHALL write `temperature`, `maxInputAttachments`, `timestamp`, `fileTools`, and `processLargeFiles` to the Quick App form in a single update and close the popup. Values of controls that were not rendered SHALL be written back unchanged. The form SHALL become dirty only if at least one value differs from its saved baseline. Save SHALL NOT call chat-api.

#### Scenario: Save changed values
- **WHEN** a user turns Built-in file tools on, moves the temperature to `0.3`, and activates Save
- **THEN** the popup SHALL close
- **AND** the form values `fileTools` SHALL be `true` and `temperature` SHALL be `0.3`, and the editor SHALL report a dirty state
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
- `fileTools` → `application_properties.features.dial_files`
- `maxInputAttachments` → the application's `maxInputAttachments`
- `temperature` → `application_properties.orchestrator.deployment.parameters.temperature` (only when the model supports temperature)
- `processLargeFiles` → `application_properties.orchestrator.attachment_strategy` (only when the model accepts attachments)

#### Scenario: Saved payload
- **WHEN** the editor saves an application whose form holds `timestamp: true`, `fileTools: true`, `maxInputAttachments: 50`
- **THEN** the update body SHALL contain `maxInputAttachments: 50`
- **AND** `applicationProperties.features.timestamp` SHALL be `{ "injection_strategy": "tool_call" }`
- **AND** `applicationProperties.features.dial_files` SHALL be `{}`

#### Scenario: Orchestrator payload
- **WHEN** the editor saves with `temperature: 0.3` and `processLargeFiles: true` for a model with `features.temperature: true` and non-empty `inputAttachmentTypes`
- **THEN** `applicationProperties.orchestrator.deployment.parameters` SHALL be `{ "temperature": 0.3 }`
- **AND** `applicationProperties.orchestrator.attachment_strategy` SHALL be `{ "type": "lazy_on_demand" }`
- **WHEN** `processLargeFiles` is `false` for that model
- **THEN** `applicationProperties.orchestrator.attachment_strategy` SHALL be `null`
- **WHEN** the selected model does not accept attachments
- **THEN** the save SHALL leave `orchestrator.attachment_strategy` as it was in the loaded configuration

#### Scenario: Switches off
- **WHEN** the editor saves with `timestamp: false` and `fileTools: false`
- **THEN** `applicationProperties.features.timestamp` and `applicationProperties.features.dial_files` SHALL both be `null`
- **AND** other existing `features` keys SHALL be preserved

#### Scenario: Defaults on load
- **WHEN** an application is loaded whose `features` has no `timestamp` key and no `dial_files` key, with no `maxInputAttachments`, no `orchestrator.deployment.parameters.temperature` and no `orchestrator.attachment_strategy`
- **THEN** the popup SHALL show the temperature at `1.0`, Time awareness on, Built-in file tools off, process files off (when shown), and an empty max attachments input

### Requirement: Advanced Settings is accessible and direction-aware
The popup controls SHALL be keyboard-operable and named, and SHALL follow the document direction.

#### Scenario: Keyboard and names
- **WHEN** a keyboard user tabs through the open popup with all controls shown
- **THEN** focus SHALL reach the Temperature slider, the temperature value input, the max attachments input, the Time awareness switch, the Built-in file tools switch, the process files switch, then the footer actions, in that order
- **AND** the input SHALL have an accessible name from its label and an accessible description from its hint
- **AND** each switch SHALL expose a switch role, its checked state, and an accessible name from its label

#### Scenario: Popup width
- **WHEN** the popup opens at the desktop breakpoint (`md` and up)
- **THEN** the popup SHALL be at most `586px` wide, so the Temperature slider and its value input fit on one row
- **AND** below the breakpoint it SHALL use the full available width without horizontal overflow

#### Scenario: Right-to-left locale
- **WHEN** the active locale is RTL
- **THEN** labels, hints, and switches SHALL align to the logical start edge using logical spacing
- **AND** the slider SHALL fill from the logical start edge, and the temperature value input SHALL sit on the logical end side of the track
- **AND** no icon in the popup body SHALL be mirrored
