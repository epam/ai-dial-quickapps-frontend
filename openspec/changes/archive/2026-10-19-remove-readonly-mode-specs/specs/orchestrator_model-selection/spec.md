# Spec Delta

## REMOVED Requirements

### Requirement: Default model block

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

## ADDED Requirements

### Requirement: Default model block (editable)

The Configuration area SHALL present the orchestrator model selection as a **Default model** block. The block SHALL have a caption heading and an end-aligned **Change** action in the same header row, with the selected-model card below the header. State SHALL remain owned by the editor's form state (`useQuickApp2Form` in `src/hooks/use-quick-app2-form.ts`) through the existing `model` field. Model data SHALL come from the existing `DataContext` (`useDataContext`). No new context, hook state owner, or chat-api request SHALL be introduced.

This change introduces no chat-api endpoint. Models continue to come from the existing `DataContext` load, `deploymentsApi.listDeployments({ interfaceType: [ListDeploymentsInterfaceTypeEnum.Chat] })` in `src/utils/dial-client.ts`.

#### Scenario: Block header is rendered

- **WHEN** the editor renders the Configuration area
- **THEN** a heading with the text from `ApplicationEditorI18nKeys.OrchestratorDefaultModel` ("Default model") SHALL be displayed, visually uppercased
- **AND** a button labelled with `ButtonsI18nKeys.Change` and a leading pencil icon SHALL be displayed at the end side of the same header row
- **AND** the block SHALL be exposed as a `section` whose accessible name is the heading text

#### Scenario: Change opens the model picker

- **WHEN** the user activates the **Change** button by pointer or keyboard (Enter/Space)
- **THEN** the model picker popup defined by "Model picker catalog list" SHALL open
- **AND** the `model` form value SHALL change only when the user confirms a highlighted row with **Add**, as defined by "Model picker single selection"
