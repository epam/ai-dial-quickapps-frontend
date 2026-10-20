# Spec Delta

## REMOVED Requirements

### Requirement: Knowledge base add-on row

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

## ADDED Requirements

### Requirement: Knowledge base add-on row (editable)

The Add-ons section SHALL contain a **Knowledge base** row titled with the `ApplicationEditorI18nKeys.KnowledgeBaseTitle`, rendered with the same row header, typography and Add button as the other Add-ons rows. The row SHALL be driven by the editor form value `documentRelativeUrl` (owned by `useQuickApp2Form`) and hold no state of its own beyond the popup's open flag. It SHALL introduce no context and call no chat-api endpoint of its own.

#### Scenario: Empty row

- **WHEN** the application has no context files
- **THEN** the row SHALL show its description `ApplicationEditorI18nKeys.KnowledgeBaseDescription` ("Documentation and resources for your agent.")
- **AND** the header SHALL show an **Add** action labelled with the `ButtonsI18nKeys.Add` and a plus icon
- **AND** no items list and no "No context files added" box SHALL be rendered

#### Scenario: Populated row

- **WHEN** the application has at least one context file
- **THEN** the row SHALL NOT show its description
- **AND** the header SHALL keep the same **Add** action
- **AND** the row SHALL list every context file in saved order, one item per line
