## ADDED Requirements

### Requirement: Temperature control

The Configuration area SHALL present the orchestrator temperature as a **Temperature** block below the Default model block: a caption `SectionRow` titled with `quickAppEditor` key `Temperature` ("Temperature"), described by `TemperatureDescription` ("Higher values will make the output more random, while lower values will make it more focused and deterministic."), containing the kit's 2.0 `Slider`. State SHALL be the editor form state's `temperature` field (`useQuickApp2Form`, default `1` via `DEFAULT_TEMPERATURE`), loaded from `application_properties.orchestrator.deployment.parameters.temperature`. No memoisation beyond the existing `useMemo` on the visibility check.

This requirement introduces no chat-api endpoint; the value is saved with the existing application save.

#### Scenario: Slider range and labels

- **WHEN** the Temperature block is shown
- **THEN** the slider SHALL range from `0` to `1` in steps of `0.1`
- **AND** it SHALL show the current value at the end of its label row with one decimal (e.g. `0.7`, `1.0`)
- **AND** it SHALL show the scale labels `TemperaturePrecise` ("Precise"), `TemperatureNeutral` ("Neutral") and `TemperatureCreative` ("Creative") below the track, from start to end
- **AND** the slider SHALL be named by `quickAppEditor` key `Temperature` for assistive technology and be operable with arrow keys

#### Scenario: Changing the temperature

- **WHEN** the user moves the slider to `0.3`
- **THEN** the form `temperature` value SHALL become `0.3`

#### Scenario: Model without temperature support

- **WHEN** the selected model is loaded and its `features.temperature` is not `true`
- **THEN** the Temperature block SHALL NOT be rendered
- **AND** on save `orchestrator.deployment.parameters` SHALL be omitted, so no temperature is sent

#### Scenario: Model with temperature support is saved

- **WHEN** the selected model has `features.temperature: true` and the form `temperature` is `0.3`
- **THEN** on save `orchestrator.deployment.parameters` SHALL be `{ "temperature": 0.3 }`

#### Scenario: Selected model not loaded yet

- **WHEN** the selected model id is not in the loaded models
- **THEN** the Temperature block SHALL be shown

#### Scenario: Read-only application

- **WHEN** the editor is read-only or the application is shared
- **THEN** the slider SHALL be disabled
- **AND** no read-only hint SHALL be shown on the slider (it is added later with the slider update)

### Requirement: Process files control

The Configuration area SHALL present the orchestrator attachment strategy as a **Process files** block below the Temperature block: a caption `SectionRow` titled with `quickAppEditor` key `ProcessFiles` ("Process files"), described by `ProcessFilesDescription`, containing the kit's `Switch` labelled `AllowOrchestratorToProcessFiles` ("Allow orchestrator to process files"). State SHALL be the form `processLargeFiles` field, loaded as `true` when `application_properties.orchestrator.attachment_strategy` is set and `false` otherwise.

This requirement introduces no chat-api endpoint.

#### Scenario: Shown only for models that accept attachments

- **WHEN** the selected model has a non-empty `inputAttachmentTypes`
- **THEN** the Process files block SHALL be rendered
- **WHEN** the selected model has no `inputAttachmentTypes`, or it is not loaded
- **THEN** the Process files block SHALL NOT be rendered

#### Scenario: Toggling the switch

- **WHEN** the user turns the switch on by pointer or keyboard (Space)
- **THEN** the form `processLargeFiles` value SHALL become `true`

#### Scenario: Saving the attachment strategy

- **WHEN** the selected model accepts attachments and `processLargeFiles` is `true`
- **THEN** on save `orchestrator.attachment_strategy` SHALL be `{ "type": "lazy_on_demand" }`
- **WHEN** the selected model accepts attachments and `processLargeFiles` is `false`
- **THEN** on save `orchestrator.attachment_strategy` SHALL be `null`
- **WHEN** the selected model does not accept attachments
- **THEN** the save SHALL leave `orchestrator.attachment_strategy` as it was in the loaded configuration

#### Scenario: Read-only application

- **WHEN** the application is shared
- **THEN** the switch SHALL be disabled
- **AND** an info button next to the switch label SHALL expose the shared-application hint (`quickAppEditor` key `CannotChangeSharedApp` with context `field`: "You cannot change the field of a shared application.") as its tooltip and accessible name

#### Scenario: Right-to-left locale

- **WHEN** `document.documentElement.dir` is `rtl`
- **THEN** the switch SHALL be at the start (right) with its label and info button following it
- **AND** no icon SHALL be mirrored
