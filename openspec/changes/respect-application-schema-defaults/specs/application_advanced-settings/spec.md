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
