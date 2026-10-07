## MODIFIED Requirements

### Requirement: Configuration contains existing model controls

The Configuration area SHALL contain the model selector, presented as the **Default model** block defined by `orchestrator_model-selection`. It SHALL also contain the temperature control when the selected model supports it, and the process-files control when that feature is available. Their values and conditional visibility SHALL NOT change.

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
