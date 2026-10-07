## MODIFIED Requirements

### Requirement: Configuration contains existing model controls

The Configuration area SHALL contain the model selector, presented as the **Default model** block defined by `orchestrator_model-selection`. It SHALL also contain the temperature control when the selected model supports it, and the process-files control when that feature is available. Their values and conditional visibility SHALL NOT change. Below these controls, Configuration SHALL render the Settings row followed directly by the Attachments row defined by `application_user-attachments`.

#### Scenario: Existing model configuration is displayed

- **WHEN** the editor loads an application with a resolved model
- **THEN** Configuration SHALL display the Default model block, followed by the temperature control behavior currently provided by the editor
- **AND** changing either control SHALL update the corresponding existing form value

#### Scenario: Temperature is unsupported

- **WHEN** the selected model does not support temperature
- **THEN** Configuration SHALL omit the temperature control as it does currently

#### Scenario: Process-files feature is unavailable

- **WHEN** the selected model or environment does not make process-file handling available
- **THEN** Configuration SHALL omit the process-files control as it does currently

#### Scenario: Settings and Attachments order

- **WHEN** the editor renders Configuration
- **THEN** the Attachments row SHALL be rendered immediately after the Settings row

### Requirement: Advanced Settings controls live only in the popup
The primary content column SHALL NOT render a standalone Advanced settings (Time awareness) section, a File tools control inside Context and tools, or a max attachments control. These settings SHALL be editable only from the Advanced Settings popup. The primary content column SHALL NOT render a User attachments section; attachment types SHALL be editable only from the Attachments row in Configuration.

#### Scenario: Main column without moved controls
- **WHEN** the editor renders its primary content column
- **THEN** no Time awareness switch, File tools switch, or max attachments input SHALL be rendered there
- **AND** Context and tools SHALL keep its other controls (context files, Code interpreter, Add attachment, Web fetch) with their existing visibility
- **AND** no User attachments section or Attachment types control SHALL be rendered there
