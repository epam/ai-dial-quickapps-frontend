## MODIFIED Requirements

### Requirement: Configuration contains existing model controls

The Configuration area SHALL contain the model selector, presented as the **Default model** block defined by `orchestrator_model-selection`. It SHALL NOT render an inline temperature control or process-files control; both are edited only in the Advanced Settings popup (`application_advanced-settings`). Directly below the Default model block, Configuration SHALL render the Settings row followed directly by the Attachments row defined by `application_user-attachments`.

#### Scenario: Existing model configuration is displayed

- **WHEN** the editor loads an application with a resolved model
- **THEN** Configuration SHALL display the Default model block, then the Settings row, then the Attachments row
- **AND** changing the model SHALL update the existing `model` form value

#### Scenario: No inline temperature or process-files controls

- **WHEN** the editor renders Configuration for a model that supports temperature and accepts attachments
- **THEN** no Temperature slider and no "Allow orchestrator to process files" switch SHALL be rendered in Configuration
- **AND** no "Process files" block title or `TemperatureDescription` text SHALL be rendered there

#### Scenario: Settings and Attachments order

- **WHEN** the editor renders Configuration
- **THEN** the Attachments row SHALL be rendered immediately after the Settings row

### Requirement: Instructions is standalone and always visible
The editor SHALL render the existing Instructions editor in a standalone, always-visible section. The Instructions section SHALL NOT be wrapped in a collapsible Orchestrator control, and no empty Orchestrator wrapper SHALL be rendered.

#### Scenario: Instructions is always available
- **WHEN** the editor first renders
- **THEN** the existing Instructions editor SHALL be displayed without activating a section control
- **AND** no `aria-expanded` control for Instructions or Orchestrator SHALL be exposed
- **AND** the model selector SHALL remain in Configuration

#### Scenario: Instructions is marked as required
- **WHEN** the Instructions section heading is rendered
- **THEN** it SHALL display a visual required marker next to the heading text
- **AND** the visual marker SHALL be hidden from assistive technology
- **AND** assistive technology SHALL instead announce a required label translated through the `common` namespace key `(required)`
- **AND** the marker SHALL be presentational only: it SHALL NOT add form validation, and an application with empty Instructions SHALL remain savable as before

#### Scenario: Instructions value is edited
- **WHEN** a user edits the Instructions editor
- **THEN** the existing instructions form value SHALL be updated
- **AND** the value SHALL continue to participate in the existing validation, dirty-state, and save serialization behavior

### Requirement: Settings popup changes form state only on Save
The Settings row SHALL own only transient popup visibility in local component state. The popup SHALL own its in-progress values as a local draft and SHALL change the Quick App form state (`useQuickApp2Form`) only when Save is activated. This applies to every popup control, including temperature and process files. Neither SHALL introduce a context, host message, or chat-api endpoint; persistence SHALL happen only through the editor's existing save and auto-save.

#### Scenario: Existing form contract is preserved
- **WHEN** a user opens the popup, changes temperature, process files, Time awareness, Built-in file tools or max attachments, and closes it without saving
- **THEN** model, temperature, process-files, Time awareness, Built-in file tools, and max attachments form values SHALL remain unchanged
- **AND** no chat-api endpoint SHALL be called because of the Settings row or popup
- **AND** the editor's existing memoisation and dirty-state behavior SHALL remain unchanged

#### Scenario: Saved popup values persist through the editor save
- **WHEN** a user saves the popup and the editor later saves the application
- **THEN** the saved application SHALL contain the popup values in the existing persisted fields
- **AND** no additional chat-api request SHALL be made beyond the editor's existing application update
