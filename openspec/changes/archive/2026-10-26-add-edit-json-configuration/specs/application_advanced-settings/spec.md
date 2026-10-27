# Spec Delta

## MODIFIED Requirements

### Requirement: Values persist through the existing application save

The popup values SHALL be serialized by the editor's existing application save without any change in shape, sent in the chat-api application update request (`@epam/ai-dial-chat-api-client` `updateApplicationBodyDto`):

- `timestamp` → `application_properties.features.timestamp`
- `fileTools` → `application_properties.features.dial_files` (defaults to `true` when the key is absent, as for a new application)
- `maxInputAttachments` → the application's `maxInputAttachments`
- `temperature` → `application_properties.orchestrator.deployment.parameters.temperature` (written from the form value when the model supports temperature). For any other model a stored `temperature` SHALL be kept as loaded and no temperature SHALL be added from the form default. Other keys of the loaded `deployment.parameters` (for example `top_p`, `seed`, `stop`, `max_tokens`) SHALL be kept as loaded; `parameters` is omitted only when there is nothing to write. While the selected model is not loaded yet, the loaded `parameters` SHALL be kept and a stored `temperature` SHALL follow the form value.
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
- **THEN** the popup SHALL show the temperature at `0.5`, Time awareness on, Built-in file tools on, process files on (when shown), and an empty max attachments input

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

