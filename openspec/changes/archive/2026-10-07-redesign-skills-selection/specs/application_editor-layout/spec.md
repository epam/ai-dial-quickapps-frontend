## MODIFIED Requirements

### Requirement: Presentation change preserves form contract

The layout change SHALL preserve existing form state ownership, field names, conditional behavior, read-only behavior, and persistence without introducing new chat-api requests. Skills SHALL continue to use the existing `agentSkills` form value, and the merged Agents & Toolsets control SHALL continue to use the existing `agentsAndToolsets` form value.

#### Scenario: Save after layout reorganization

- **WHEN** a user changes a moved Skills or Agents & Toolsets selection or the instructions and saves
- **THEN** the saved application SHALL contain the same corresponding configuration values as before the reorganization
- **AND** the editor SHALL make no additional chat-api request because of the layout change

#### Scenario: Read-only editor

- **WHEN** the editor is read-only or the application is shared
- **THEN** moved controls SHALL retain their existing disabled/read-only behavior
- **AND** Add actions SHALL not allow a selection modal to be opened

#### Scenario: Existing selections remain visible

- **WHEN** an application loads with one or more skills or agents/toolsets already selected
- **THEN** the corresponding Add-ons content window SHALL be visible
- **AND** the selected agents/toolsets chips SHALL keep their existing remove/configuration behavior
- **AND** the selected skills SHALL be listed as defined by `skills_catalog` ("Attached skills list"), with removal available from the skill details popup

### Requirement: Skills content window is conditional

The Skills row SHALL render the Skills content window (the attached skills list defined by `skills_catalog`) only when at least one skill is selected. Its Add action SHALL remain visible regardless of selection count.

#### Scenario: No skills selected

- **WHEN** the `agentSkills` selection is empty
- **THEN** the Skills Add action SHALL be visible and enabled unless the editor is read-only
- **AND** the Skills content window SHALL not be rendered

#### Scenario: Skill selected

- **WHEN** the `agentSkills` selection contains at least one skill
- **THEN** the Skills content window SHALL be rendered as the attached skills list, with no chip box; each item reveals a trash button on hover or focus in an editable editor
- **AND** the Skills Add action SHALL remain visible

#### Scenario: Last skill removed

- **WHEN** a user removes the last selected skill with its trash button, through the skill details popup's Delete action, or by unchecking it in the Add skill popup and confirming
- **THEN** the `agentSkills` form value SHALL become empty
- **AND** the Skills content window SHALL be removed without changing any other form value
