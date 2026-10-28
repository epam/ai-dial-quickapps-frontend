## MODIFIED Requirements

### Requirement: Feature toggles are drafted and saved with the popup

When the stored application has no `features.representation_tooling` / `features.web_fetch` key (including a new application), the form values `addAttachment` and `webFetch` SHALL default to the application type schema default (`application_editing`, "Application type schema defaults") when the schema provides one, and to `true`, like `timestamp`, otherwise; a stored key, including one saved as off, SHALL be read as stored. A host setting that is off still forces the value to `false`.

The draft SHALL be seeded from the form values `addAttachment` and `webFetch`. Edits SHALL change only the draft; Save SHALL write them with the other popup values in a single update; dismissal SHALL discard them. Persistence SHALL be unchanged: the values are serialized by the editor's existing application save, with no new request and no change in saved shape.

#### Scenario: Schema default for a new application

- **WHEN** a new application is loaded and the schema defaults are `add_attachment: true` and `web_fetch.enabled: false`
- **THEN** the form value `addAttachment` SHALL be `true` and `webFetch` SHALL be `false`
- **AND** the form SHALL NOT be dirty

#### Scenario: No schema default

- **WHEN** a new application is loaded and the schema provides no default for these features, or could not be read
- **THEN** the form values `addAttachment` and `webFetch` SHALL be `true`

#### Scenario: Toggle and save

- **WHEN** a user turns Web fetch on and activates Save
- **THEN** the form value `webFetch` SHALL be `true`, the popup SHALL close and the editor SHALL report a dirty state
- **AND** no chat-api request SHALL be made until the editor's own save or auto-save

#### Scenario: Toggle and dismiss

- **WHEN** a user changes any of the three switches and closes the popup without saving
- **THEN** the form values and dirty state SHALL be unchanged

#### Scenario: Unrendered toggle is preserved

- **WHEN** a host setting is off and the user saves the popup
- **THEN** the corresponding form value SHALL be written back unchanged

#### Scenario: Keyboard and names

- **WHEN** a keyboard user tabs through the popup
- **THEN** focus SHALL reach each rendered feature switch after the process files switch and before the footer actions
- **AND** each SHALL expose a switch role, its checked state and an accessible name from its label

## ADDED Requirements

### Requirement: Initial temperature honours the schema default

When the stored application has no `orchestrator.deployment.parameters.temperature`, the form value `temperature` SHALL start as the application type schema default (`application_editing`, "Application type schema defaults") when that default is a number from `0` to `1` (`MIN_TEMPERATURE` to `MAX_TEMPERATURE`, inclusive), and as `0.5` (`DEFAULT_TEMPERATURE`) otherwise, including when the schema default is `null`, which means the model's own default. A stored temperature SHALL be read as stored. The initial value SHALL NOT mark the form dirty. Whether a temperature is written on save is unchanged: it is written only for a model that supports temperature.

#### Scenario: Schema default for a new application

- **WHEN** a new application is loaded and the schema default of `temperature` is `0.2`
- **THEN** the form value `temperature` SHALL be `0.2` and the popup slider SHALL show `0.2`
- **AND** the form SHALL NOT be dirty

#### Scenario: Zero is a valid default

- **WHEN** the schema default of `temperature` is `0`
- **THEN** the form value `temperature` SHALL be `0`

#### Scenario: Schema default is null or out of range

- **WHEN** the schema default of `temperature` is `null`, or `1.5`, or `-0.1`, or not a number
- **THEN** the form value `temperature` SHALL be `0.5`

#### Scenario: Stored temperature wins

- **WHEN** the application stores `temperature: 0.7` and the schema default is `0.2`
- **THEN** the form value `temperature` SHALL be `0.7`
