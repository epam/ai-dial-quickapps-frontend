## MODIFIED Requirements

### Requirement: Model picker loading and error states

The picker SHALL keep explicit loading, error and empty states while preserving the header and footer.

#### Scenario: Models loading

- **WHEN** the `DataContext` status is `idle` or `loading`
- **THEN** the list area SHALL show a spinner with accessible label `DeploymentSelectorI18nKeys.Loading`
- **AND** **Add** SHALL be disabled

#### Scenario: Load error

- **WHEN** the `DataContext` status is `error`
- **THEN** the list area SHALL show `DeploymentSelectorI18nKeys.Error` and a **Retry** button (`ButtonsI18nKeys.Retry`) that calls `refreshAll`. Below the title it SHALL show `DataContext.error`, which is the chat-api error message of the failed load (`getChatApiErrorMessage`), or nothing when the failure carries none; the raw client or browser error text SHALL NOT be shown

#### Scenario: No selectable models

- **WHEN** models have loaded, no search or filter is active, and none is selectable
- **THEN** the list area SHALL show the `BasicI18nKeys.NotAvailable` empty state

### Requirement: Default model loading and error states

The Default model block SHALL keep explicit loading and validation-error states. The `model`
field's validation messages SHALL be `ApplicationEditorI18nKeys` members, translated where the
card renders them:

- `OrchestratorModelUnavailable` (`applicationEditor.orchestrator.modelUnavailable`, "Not
  available agent selected. Please, change the agent to proceed") when the model is not among
  the available models;
- `OrchestratorModelToolsUnsupported` (`applicationEditor.orchestrator.modelToolsUnsupported`,
  "Selected model does not support tools") when it does not support tools.

A manual save blocked by these errors SHALL send the same translated text in SaveError
(`application_editing`, "Save trigger gating").

#### Scenario: Models still loading

- **WHEN** the `DataContext` status is `idle` or `loading` and the selected model is not yet known
- **THEN** the card SHALL show a circular skeleton in place of the icon and a text skeleton in place of the label, name and version
- **AND** the **Change** button SHALL be disabled

#### Scenario: Validation error on model

- **WHEN** the `model` field has the `OrchestratorModelToolsUnsupported` validation error
- **THEN** the card SHALL render with the error border colour
- **AND** the translation of `OrchestratorModelToolsUnsupported` ("Selected model does not support
  tools") SHALL be shown below the card, not the key
