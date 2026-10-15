## MODIFIED Requirements

### Requirement: Add skill popup loading and error states

The Add skill popup SHALL keep explicit loading, error and empty states while preserving its header and footer.

#### Scenario: Skills loading

- **WHEN** the `DataContext` status is `idle` or `loading`
- **THEN** the list area SHALL show a spinner with accessible label `ApplicationEditorI18nKeys.SkillsLoading`
- **AND** **Add** SHALL be disabled

#### Scenario: Load error

- **WHEN** the `DataContext` status is `error`
- **THEN** the list area SHALL show `CatalogI18nKeys.SkillsLoadError` and a **Retry** button that calls `refreshAll`, with `DataContext.error` below the title only when the failure carried a chat-api error message (as defined in `orchestrator_model-selection`, "Model picker loading and error states")
- **AND** **Add** SHALL be disabled

#### Scenario: Empty catalog

- **WHEN** skills have loaded, no search or filter is active, and the catalog has no skills
- **THEN** the list area SHALL show the `ApplicationEditorI18nKeys.SkillsEmpty` empty state
