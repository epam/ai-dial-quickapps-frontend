# Spec Delta

## MODIFIED Requirements

### Requirement: Skills content window is conditional

The Skills row SHALL render the Skills content window (the attached skills list defined by `skills_catalog`) only when at least one skill is selected. Its Add action SHALL remain visible regardless of selection count.

#### Scenario: No skills selected

- **WHEN** the `agentSkills` selection is empty
- **THEN** the Skills Add action SHALL be visible and enabled
- **AND** the Skills content window SHALL not be rendered

#### Scenario: Skill selected

- **WHEN** the `agentSkills` selection contains at least one skill
- **THEN** the Skills content window SHALL be rendered as the attached skills list, with no chip box; each item reveals a trash button on hover or focus in an editable editor
- **AND** the Skills Add action SHALL remain visible

#### Scenario: Last skill removed

- **WHEN** a user removes the last selected skill with its trash button, through the skill details popup's Delete action, or by unchecking it in the Add skill popup and confirming
- **THEN** the `agentSkills` form value SHALL become empty
- **AND** the Skills content window SHALL be removed without changing any other form value

### Requirement: Agents and Toolsets content window is conditional

The Toolsets row SHALL render its content window (the attached toolsets list) only when at least one toolset entry is selected. The Agents row SHALL render its content window (the attached agents list) only when at least one agent entry is selected. Each row's Add action SHALL remain visible regardless of selection count.

#### Scenario: No toolsets selected

- **WHEN** `addOns` holds no toolset entry, but may hold agent entries
- **THEN** the Toolsets Add action SHALL be visible and enabled
- **AND** the Toolsets row SHALL show its description and no content window

#### Scenario: No agents selected

- **WHEN** `addOns` holds no agent entry, but may hold toolset entries
- **THEN** the Agents Add action SHALL be visible and enabled
- **AND** the Agents row SHALL show its description and no content window

#### Scenario: Toolset or agent selected

- **WHEN** `addOns` holds at least one entry of a row's kind
- **THEN** that row SHALL render its list, with no chip box
- **AND** its Add action SHALL remain visible in the row header

#### Scenario: Last toolset removed

- **WHEN** a user removes the last toolset entry with its trash button, through the details popup's Delete, or by unchecking it in Add toolset and confirming
- **THEN** the Toolsets content window SHALL be removed
- **AND** the agent entries of `addOns`, and unrelated context settings, SHALL be unchanged

#### Scenario: Last agent removed

- **WHEN** a user removes the last agent entry
- **THEN** the Agents content window SHALL be removed and the toolset entries SHALL be unchanged

### Requirement: Agents and Toolsets has no JSON view

The Toolsets and Agents rows SHALL NOT offer a JSON view. The editor SHALL NOT render a JSON toggle, a JSON editor, Save JSON or Discard actions, or a discard-JSON confirmation for agents and toolsets. Saving SHALL preserve existing `tool_sets` entries that the rows can represent, including inline toolsets without a `deployment_id`.

#### Scenario: No JSON affordance in any state

- **WHEN** the Add-ons section is rendered, with or without selected agents or toolsets
- **THEN** no JSON toggle, JSON editor, Save JSON action, or Discard action SHALL be rendered for the Toolsets or Agents rows

#### Scenario: Existing inline toolset is preserved on save

- **WHEN** an application whose saved `tool_sets` contain an inline toolset without a `deployment_id` is loaded and then saved without changing agents or toolsets
- **THEN** the inline toolset SHALL be listed in the Toolsets row
- **AND** the saved `tool_sets` SHALL still contain that inline toolset configuration

#### Scenario: Code interpreter is saved independently of agents and toolsets

- **WHEN** the code interpreter setting is enabled or disabled and the application is saved
- **THEN** the saved `tool_sets` SHALL include or omit the code interpreter toolset accordingly
- **AND** the remaining `tool_sets` entries SHALL be built from the `addOns` form value

## REMOVED Requirements

### Requirement: Presentation change preserves form contract

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

### Requirement: Configuration exposes a Settings entry point

**Reason**: The editor has no read-only mode, so the read-only scenarios and wording of this requirement no longer apply. OpenSpec cannot drop a scenario from a MODIFIED block, so the requirement is re-added under a renamed title.
**Migration**: See the renamed requirement in the ADDED section below; its behaviour is otherwise unchanged.

## ADDED Requirements

### Requirement: Presentation change preserves form contract (editable)

The layout change SHALL preserve existing form state ownership, field names, conditional behavior, and persistence without introducing new chat-api requests. Skills SHALL continue to use the existing `agentSkills` form value. The Toolsets and Agents rows SHALL both continue to use the existing `addOns` form value: each row shows and edits only its own entries, as classified by `toolsets_selection` ("Toolset entries of the add-ons value") and `agents_selection` ("Agent entries of the add-ons value").

#### Scenario: Save after layout reorganization

- **WHEN** a user changes a moved Skills, Toolsets or Agents selection or the instructions and saves
- **THEN** the saved application SHALL contain the same corresponding configuration values as before the reorganization
- **AND** the editor SHALL make no additional chat-api request because of the layout change

#### Scenario: Shared application

- **WHEN** the application is shared with the user, however the host or chat-api flags it
- **THEN** the editor SHALL behave exactly as for the user's own application: every control SHALL be editable and no control SHALL be disabled or carry a shared-application hint because of that
- **AND** whether the user may change the application SHALL be decided by the host by chat-api when saving, never by the editor inspecting the application's sharing flags

#### Scenario: Existing selections remain visible

- **WHEN** an application loads with one or more skills, toolsets or agents already selected
- **THEN** the corresponding Add-ons content window SHALL be visible
- **AND** the selected skills SHALL be listed as defined by `skills_catalog` ("Attached skills list (editable)")
- **AND** the selected toolsets SHALL be listed as defined by `toolsets_selection` ("Attached toolsets list (editable)"), and the selected agents as defined by `agents_selection` ("Attached agents list (editable)"), with removal, sign-in and configuration available from the rows' trash buttons and details popups

### Requirement: Configuration exposes a Settings entry point (editable)

The Configuration area SHALL retain its existing model controls and render a translated Settings row with a trailing Advanced action.

#### Scenario: Settings row is visible

- **WHEN** the Quick App editor renders its Configuration area
- **THEN** the existing model controls remain available
- **AND** a Settings row is rendered with the translated `BasicI18nKeys.Settings` label
- **AND** the row exposes a translated Advanced action using `ApplicationEditorI18nKeys.AdvancedSettingsAdvanced`
